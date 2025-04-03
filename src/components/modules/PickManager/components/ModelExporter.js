import * as THREE from 'three';
import { saveAs } from 'file-saver';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { ColladaExporter } from 'three/examples/jsm/exporters/ColladaExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import ThreePolyfill from './ThreePolyfill';

// Una classe per gestire l'esportazione di modelli 3D in diversi formati
class ModelExporter {
  constructor(scene) {
    this.scene = scene;
    this.objExporter = new OBJExporter();
    this.colladaExporter = new ColladaExporter();
    this.gltfExporter = new GLTFExporter();
    
    // Nota: Three.js non ha un esportatore nativo per FBX,
    // implementeremo fallback verso altri formati quando necessario
  }

  // Prepara la scena per l'esportazione applicando le trasformazioni di scala
  prepareSceneForExport(scale = 1.0) {
    // Invece di clonare la scena che potrebbe non funzionare bene in tutte le versioni di Three.js,
    // usiamo la scena originale con precauzione
    const exportScene = this.scene;
    
    // Applica la scala a tutti gli oggetti se necessario
    if (scale !== 1.0) {
      const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);
      const objectsToRestore = [];
      
      // Salva lo stato originale di ogni oggetto per poterlo ripristinare dopo
      exportScene.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          // Salva una copia della geometria originale
          objectsToRestore.push({
            object: obj,
            originalGeometry: obj.geometry.clone()
          });
          
          // Applica la scala
          obj.geometry.applyMatrix4(scaleMatrix);
        }
      });
      
      // Restituisci sia la scena che i dati di ripristino
      return {
        scene: exportScene,
        restore: () => {
          // Ripristina tutte le geometrie originali
          objectsToRestore.forEach(item => {
            item.object.geometry.dispose(); // Libera memoria
            item.object.geometry = item.originalGeometry;
          });
        }
      };
    }
    
    // Nessuna trasformazione necessaria
    return {
      scene: exportScene,
      restore: () => {} // Funzione di ripristino vuota
    };
  }

  // Esporta in formato OBJ
  exportToOBJ(options = {}) {
    const { scale = 1.0, fileName = 'model.obj' } = options;
    const { scene, restore } = this.prepareSceneForExport(scale);
    
    try {
      const result = this.objExporter.parse(scene);
      const blob = new Blob([result], { type: 'text/plain' });
      saveAs(blob, fileName);
      
      // Ripristina la scena originale
      restore();
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to OBJ:', error);
      
      // Assicurati di ripristinare la scena anche in caso di errore
      restore();
      
      return { success: false, error: error.message };
    }
  }

  // Esporta in formato DAE (Collada)
  exportToDAE(options = {}) {
    const { 
      scale = 1.0, 
      fileName = 'model.dae',
      texturePath = 'textures/'
    } = options;
    
    const { scene, restore } = this.prepareSceneForExport(scale);
    
    try {
      const result = this.colladaExporter.parse(scene, undefined, { texturePath });
      const blob = new Blob([result.data], { type: 'text/plain' });
      saveAs(blob, fileName);
      
      // Se ci sono texture, le esportiamo come file zip
      if (result.textures && result.textures.length) {
        console.log('Textures would be zipped and exported here');
        // Implementazione per comprimere e salvare le texture in una cartella
      }
      
      // Ripristina la scena originale
      restore();
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to DAE:', error);
      
      // Assicurati di ripristinare la scena anche in caso di errore
      restore();
      
      return { success: false, error: error.message };
    }
  }

  // Esporta in formato GLTF/GLB
  exportToGLTF(options = {}) {
    const { 
      scale = 1.0, 
      fileName = 'model.gltf',
      binary = false,
      embedImages = true
    } = options;
    
    const { scene, restore } = this.prepareSceneForExport(scale);
    const gltfOptions = {
      binary,
      embedImages,
      // Altre opzioni GLTF
    };
    
    try {
      this.gltfExporter.parse(
        scene,
        (result) => {
          let blob;
          
          if (binary) {
            blob = new Blob([result], { type: 'application/octet-stream' });
            saveAs(blob, fileName.replace('.gltf', '.glb'));
          } else {
            blob = new Blob([JSON.stringify(result, null, 2)], { type: 'text/plain' });
            saveAs(blob, fileName);
          }
          
          // Ripristina la scena originale
          restore();
        },
        (error) => {
          console.error('Error in GLTF export:', error);
          
          // Assicurati di ripristinare la scena anche in caso di errore
          restore();
          
          return { success: false, error: error.message };
        },
        gltfOptions
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to GLTF:', error);
      
      // Assicurati di ripristinare la scena anche in caso di errore
      restore();
      
      return { success: false, error: error.message };
    }
  }

  // Metodo generico per esportare in qualsiasi formato supportato
  export(format, options = {}) {
    const formatLower = format.toLowerCase();
    let fileName = options.fileName || `model.${formatLower}`;
    
    // Per formati non direttamente supportati come SketchUp e FBX,
    // esportiamo come OBJ che è un formato più universale
    if (['skp', 'fbx'].includes(formatLower)) {
      console.log(`Direct ${formatLower.toUpperCase()} export not supported. Exporting as OBJ instead.`);
      fileName = fileName.replace(new RegExp(`.${formatLower}$`), '.obj');
      return this.exportToOBJ({
        ...options,
        fileName
      });
    }
    
    // Per gli altri formati supportati
    switch (formatLower) {
      case 'obj':
        return this.exportToOBJ(options);
      case 'dae':
        return this.exportToDAE(options);
      case 'gltf':
      case 'glb':
        return this.exportToGLTF({ 
          ...options, 
          binary: formatLower === 'glb' 
        });
      default:
        console.error(`Unsupported export format: ${format}`);
        return { 
          success: false, 
          error: `Unsupported export format: ${format}. Supported formats are: obj, dae, gltf, glb, skp, fbx` 
        };
    }
  }
  
  // Metodo per catturare uno screenshot della scena attuale
  captureScreenshot(renderer, camera, options = {}) {
    const { 
      fileName = 'screenshot.png',
      width = 1920,
      height = 1080
    } = options;
    
    // Memorizza le dimensioni originali del renderer
    const originalSize = {
      width: renderer.domElement.width,
      height: renderer.domElement.height
    };
    
    // Imposta le dimensioni per lo screenshot
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    // Rendi la scena
    renderer.render(this.scene, camera);
    
    // Cattura lo screenshot
    try {
      renderer.domElement.toBlob((blob) => {
        saveAs(blob, fileName);
      });
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
    
    // Ripristina le dimensioni originali
    renderer.setSize(originalSize.width, originalSize.height, false);
    camera.aspect = originalSize.width / originalSize.height;
    camera.updateProjectionMatrix();
    
    return { success: true };
  }
}

export default ModelExporter;