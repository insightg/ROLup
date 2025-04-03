import * as THREE from 'three';

// Aggiungiamo un metodo di clonazione per la scena che manca in Three.js
if (!THREE.Scene.prototype.clone) {
  THREE.Scene.prototype.clone = function() {
    const newScene = new THREE.Scene();
    
    // Copia le proprietà di base
    newScene.background = this.background;
    newScene.fog = this.fog;
    newScene.environment = this.environment;
    
    // Clona gli oggetti della scena
    this.children.forEach(child => {
      if (child.clone) {
        newScene.add(child.clone());
      }
    });
    
    return newScene;
  };
}

// Implementazione di base per clonare gli oggetti se manca
if (!THREE.Object3D.prototype.clone) {
  THREE.Object3D.prototype.clone = function() {
    return new THREE.Object3D().copy(this);
  };
}

export default {
  // Esporta eventuali funzioni di utilità qui
  sceneToJSON: (scene) => {
    return JSON.stringify(scene.toJSON());
  },
  
  // Funzione helper per convertire colori e materiali
  convertMaterialsToBasic: (object) => {
    object.traverse((node) => {
      if (node.isMesh && node.material) {
        // Converti in materiale base
        const color = node.material.color ? node.material.color.getHex() : 0xcccccc;
        node.material = new THREE.MeshBasicMaterial({ color });
      }
    });
    return object;
  }
};