/**
 * SimpleModelExporter - Un esportatore di modelli 3D semplificato che non richiede moduli esterni di Three.js
 * Questa versione funziona direttamente con le API base di Three.js
 */

import * as THREE from 'three';
import { saveAs } from 'file-saver';

class SimpleModelExporter {
  constructor(scene) {
    this.scene = scene;
  }

  // Esporta in JSON (formato nativo Three.js)
  exportToJSON(options = {}) {
    const { fileName = 'model.json' } = options;
    
    try {
      // Ottieni l'oggetto json dalla scena
      const json = this.scene.toJSON();
      
      // Converti in stringa JSON
      const jsonStr = JSON.stringify(json, null, 2);
      
      // Crea un blob e salva il file
      const blob = new Blob([jsonStr], { type: 'application/json' });
      saveAs(blob, fileName);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      return { success: false, error: error.message };
    }
  }

  // Esporta in STL (formato semplice per mesh)
  exportToSTL(options = {}) {
    const { fileName = 'model.stl' } = options;
    
    try {
      let meshes = [];
      
      // Raccogli tutte le mesh nella scena
      this.scene.traverse((object) => {
        if (object.isMesh) {
          meshes.push(object);
        }
      });
      
      if (meshes.length === 0) {
        console.warn('No meshes found in the scene');
        return { success: false, error: 'No meshes found in the scene' };
      }
      
      // Genera un file STL ASCII
      const stlContent = this.generateSTL(meshes);
      
      // Crea un blob e salva il file
      const blob = new Blob([stlContent], { type: 'application/octet-stream' });
      saveAs(blob, fileName);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to STL:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Generatore di file STL (formato ASCII)
  generateSTL(meshes) {
    let output = 'solid exported\n';
    
    // Per ogni mesh nella scena
    meshes.forEach(mesh => {
      // Clone della geometria per applicare le trasformazioni
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      
      // Ottieni i vertici e le facce
      const positions = geometry.attributes.position;
      const indices = geometry.index ? geometry.index.array : null;
      
      if (indices) {
        // Indexed geometry
        for (let i = 0; i < indices.length; i += 3) {
          const a = indices[i];
          const b = indices[i + 1];
          const c = indices[i + 2];
          
          const v1 = new THREE.Vector3(positions.getX(a), positions.getY(a), positions.getZ(a));
          const v2 = new THREE.Vector3(positions.getX(b), positions.getY(b), positions.getZ(b));
          const v3 = new THREE.Vector3(positions.getX(c), positions.getY(c), positions.getZ(c));
          
          // Calcola la normale
          const normal = new THREE.Vector3();
          normal.crossVectors(
            new THREE.Vector3().subVectors(v2, v1),
            new THREE.Vector3().subVectors(v3, v1)
          ).normalize();
          
          output += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
          output += '    outer loop\n';
          output += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
          output += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
          output += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
          output += '    endloop\n';
          output += '  endfacet\n';
        }
      } else {
        // Non-indexed geometry
        for (let i = 0; i < positions.count; i += 3) {
          const v1 = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
          const v2 = new THREE.Vector3(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
          const v3 = new THREE.Vector3(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));
          
          // Calcola la normale
          const normal = new THREE.Vector3();
          normal.crossVectors(
            new THREE.Vector3().subVectors(v2, v1),
            new THREE.Vector3().subVectors(v3, v1)
          ).normalize();
          
          output += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
          output += '    outer loop\n';
          output += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
          output += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
          output += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
          output += '    endloop\n';
          output += '  endfacet\n';
        }
      }
      
      // Pulisci memoria
      geometry.dispose();
    });
    
    output += 'endsolid exported';
    return output;
  }
  
  // Esporta uno screenshot della scena
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
  
  // Metodo generico per esportare in qualsiasi formato supportato
  export(format, options = {}) {
    const formatLower = format.toLowerCase();
    
    switch (formatLower) {
      case 'json':
        return this.exportToJSON(options);
      case 'stl':
        return this.exportToSTL(options);
      case 'obj':
      case 'dae':
      case 'skp':
      case 'fbx':
        // Per formati avanzati che richiederebbero moduli esterni, esportiamo in STL
        console.log(`Direct ${formatLower.toUpperCase()} export not supported. Exporting as STL instead.`);
        const fileName = options.fileName ? 
            options.fileName.replace(`.${formatLower}`, '.stl') : 
            'model.stl';
        return this.exportToSTL({
          ...options,
          fileName
        });
      default:
        console.error(`Unsupported export format: ${format}`);
        return { 
          success: false, 
          error: `Unsupported export format: ${format}. Supported formats are: json, stl` 
        };
    }
  }
}

export default SimpleModelExporter;