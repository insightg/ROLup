import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Box, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { saveAs } from 'file-saver';
// Rimuoviamo gli import non utilizzati direttamente nel componente.
// Gli esportatori saranno gestiti da ModelExporter.js
import { Box as MuiBox, Typography, CircularProgress } from '@mui/material';
import { usePickStore } from '../stores/pickStore';

// Componente per creare uno scaffale interno al modulo
const ModuleShelf = ({ width, depth, thickness = 0.02, position, color = '#dddddd' }) => {
  return (
    <Box 
      args={[width, thickness, depth]} 
      position={position}
    >
      <meshStandardMaterial 
        color={color} 
        metalness={0.1} 
        roughness={0.5} 
      />
    </Box>
  );
};

// Componente per creare un divisorio verticale nel modulo
const ModuleDivider = ({ height, depth, thickness = 0.02, position, color = '#dddddd' }) => {
  return (
    <Box 
      args={[thickness, height, depth]} 
      position={position}
    >
      <meshStandardMaterial 
        color={color} 
        metalness={0.1} 
        roughness={0.5} 
      />
    </Box>
  );
};

// Componente per creare un gancio o accessorio nel modulo
const ModuleAccessory = ({ size = 0.1, position, color = '#aaaaaa' }) => {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[size/3, size/3, size, 8]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
};

// Componenti dei moduli
// Diversi tipi di componenti che possono essere trovati nei moduli
const COMPONENT_TYPES = {
  SHELF: 'shelf',
  DIVIDER: 'divider',
  DRAWER: 'drawer',
  HANGER: 'hanger',
  HOOK: 'hook',
  DOOR: 'door',
  HANDLE: 'handle',
  BASKET: 'basket',
  RAIL: 'rail'
};

// Mappa dei materiali comuni per colore
const MATERIAL_COLORS = {
  'wood': '#8B4513',
  'metal': '#A9A9A9',
  'plastic': '#F5F5F5',
  'glass': '#ADD8E6',
  'aluminium': '#D3D3D3',
  'steel': '#708090',
  'chrome': '#C0C0C0',
  'brass': '#B5A642',
  'copper': '#B87333',
  'fabric': '#DEB887'
};

// Componente per visualizzare un cassetto
const ModuleDrawer = ({ width, height, depth, position, color = '#a89e8f' }) => {
  return (
    <group position={position}>
      <Box 
        args={[width, height, depth]} 
        position={[0, 0, 0]}
      >
        <meshStandardMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.7} 
        />
      </Box>
      {/* Maniglia del cassetto */}
      <Box 
        args={[width * 0.3, height * 0.1, depth * 0.05]} 
        position={[0, 0, depth/2 + 0.01]}
      >
        <meshStandardMaterial 
          color="#B5B5B5" 
          metalness={0.5} 
          roughness={0.3} 
        />
      </Box>
    </group>
  );
};

// Componente per visualizzare un'anta
const ModuleDoor = ({ width, height, thickness = 0.02, position, color = '#a89e8f', isGlass = false }) => {
  return (
    <Box 
      args={[width, height, thickness]} 
      position={position}
    >
      <meshStandardMaterial 
        color={color} 
        metalness={isGlass ? 0.5 : 0.1} 
        roughness={isGlass ? 0.1 : 0.7} 
        transparent={isGlass}
        opacity={isGlass ? 0.6 : 1}
      />
    </Box>
  );
};

// Componente per visualizzare un supporto per appendere
const ModuleHanger = ({ width, height = 0.03, position, color = '#B5B5B5' }) => {
  return (
    <group position={position}>
      {/* Barra orizzontale */}
      <mesh>
        <cylinderGeometry args={[height/2, height/2, width, 8]} rotation={[0, 0, Math.PI/2]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Supporti alle estremità */}
      <Box 
        args={[0.02, 0.05, 0.05]} 
        position={[-width/2, 0, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
      </Box>
      <Box 
        args={[0.02, 0.05, 0.05]} 
        position={[width/2, 0, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
      </Box>
    </group>
  );
};

// Componente per visualizzare un cestello
const ModuleBasket = ({ width, height, depth, position, color = '#B5B5B5' }) => {
  return (
    <group position={position}>
      {/* Base del cestello */}
      <Box 
        args={[width, 0.01, depth]} 
        position={[0, -height/2, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Box>
      
      {/* Lati del cestello */}
      <Box 
        args={[0.01, height, depth]} 
        position={[-width/2, 0, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Box>
      <Box 
        args={[0.01, height, depth]} 
        position={[width/2, 0, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Box>
      <Box 
        args={[width, height, 0.01]} 
        position={[0, 0, -depth/2]}
      >
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Box>
      <Box 
        args={[width, height, 0.01]} 
        position={[0, 0, depth/2]}
      >
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Box>
    </group>
  );
};

// Componente modulo 3D completo con dettagli interni basati sui dati DB
const Module3D = ({ module, position = [0, 0, 0], color = '#f5f5f5', againstWall = true }) => {
  // Hook per accedere allo store
  const { getModuleComponents, loadModuleComponents } = usePickStore();
  
  // State locale per tenere traccia se i componenti sono stati caricati
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  
  // Calcola dimensioni da mm a unità Three.js (diviso per 100 per scalare correttamente)
  const width = module.width / 100;
  const height = module.height / 100;
  const depth = module.depth / 100 || width / 2; // Se non c'è profondità, userremo metà della larghezza
  
  // Riferimento al mesh per esportazione
  const meshRef = useRef();
  
  // Ottieni i componenti dal database
  useEffect(() => {
    // Carica i componenti del modulo se non sono già stati caricati
    const loadComponentsData = async () => {
      try {
        await loadModuleComponents(module.module_id);
        setComponentsLoaded(true);
      } catch (error) {
        console.error('Failed to load module components:', error);
      }
    };
    
    if (!componentsLoaded && module.module_id) {
      loadComponentsData();
    }
  }, [module, componentsLoaded, loadModuleComponents]);
  
  // Recupera i componenti già caricati dallo store
  const components = getModuleComponents(module.module_id);
  
  // Posiziona il modulo contro la parete se richiesto
  let modulePosition = [...position];
  let wallOffset = 0;
  
  if (againstWall) {
    // Se è contro la parete, sposta il modulo indietro della metà della sua profondità
    wallOffset = -5; // La parete è a -5 unità sull'asse Z
    
    if (module.installation_type === 'FLOOR') {
      // Per moduli a pavimento, posizioniamo la base sul piano e il retro contro la parete
      modulePosition[1] = height / 2;
      modulePosition[2] = wallOffset + depth/2;
    } else if (module.installation_type === 'WALL') {
      // Per moduli a muro, posizioniamo completamente contro la parete
      modulePosition[2] = wallOffset + depth/2;
    }
  } else {
    // Posizionamento standard senza parete
    if (module.installation_type === 'FLOOR') {
      modulePosition[1] = height / 2;
    } else if (module.installation_type === 'WALL') {
      modulePosition[2] = depth / 2;
    }
  }

  // Funzione per convertire le coordinate percentuali in coordinate 3D
  // Ogni componente nel DB ha coordinate x,y,z espresse in percentuale della dimensione del modulo
  const convertCoordinates = (x, y, z) => {
    // Converti da percentuale della dimensione del modulo (0-100%) a coordinate 3D (-size/2 a +size/2)
    return [
      (x / 100 * width) - (width / 2),
      (y / 100 * height) - (height / 2),
      (z / 100 * depth) - (depth / 2)
    ];
  };

  // Genera componenti in base ai dati dal database
  const generateComponents = () => {
    if (!components || components.length === 0) {
      // Se non abbiamo componenti dal DB, genera alcuni componenti generici predefiniti
      return generateGenericComponents();
    }
    
    return components.map((component, index) => {
      // Converti dimensioni da mm a unità Three.js
      const componentWidth = (component.width || module.width * 0.8) / 100;
      const componentHeight = (component.height || 0.02) / 100;
      const componentDepth = (component.depth || module.depth * 0.8) / 100;
      
      // Converti posizione da percentuale a coordinate 3D
      const position = convertCoordinates(
        component.position_x || 50, 
        component.position_y || 50, 
        component.position_z || 50
      );
      
      // Determina il colore in base al materiale
      const componentColor = MATERIAL_COLORS[component.material] || '#dddddd';
      
      // Genera il componente specifico in base al tipo
      switch (component.type) {
        case COMPONENT_TYPES.SHELF:
          return (
            <ModuleShelf 
              key={`component-${index}`}
              width={componentWidth}
              depth={componentDepth}
              position={position}
              color={componentColor}
            />
          );
        case COMPONENT_TYPES.DIVIDER:
          return (
            <ModuleDivider 
              key={`component-${index}`}
              height={componentHeight * 50} // Altezza moltiplicata per avere un divisore verticale
              depth={componentDepth}
              position={position}
              color={componentColor}
            />
          );
        case COMPONENT_TYPES.DRAWER:
          return (
            <ModuleDrawer 
              key={`component-${index}`}
              width={componentWidth}
              height={componentHeight * 10} // Altezza moltiplicata per un cassetto proporzionato
              depth={componentDepth}
              position={position}
              color={componentColor}
            />
          );
        case COMPONENT_TYPES.DOOR:
          return (
            <ModuleDoor 
              key={`component-${index}`}
              width={componentWidth}
              height={componentHeight * 50} // Altezza moltiplicata per un'anta proporzionata
              position={position}
              color={componentColor}
              isGlass={component.material === 'glass'}
            />
          );
        case COMPONENT_TYPES.HANGER:
          return (
            <ModuleHanger 
              key={`component-${index}`}
              width={componentWidth}
              position={position}
              color={componentColor}
            />
          );
        case COMPONENT_TYPES.HOOK:
          return (
            <ModuleAccessory 
              key={`component-${index}`}
              position={position}
              color={componentColor}
              size={component.size || 0.1}
            />
          );
        case COMPONENT_TYPES.BASKET:
          return (
            <ModuleBasket 
              key={`component-${index}`}
              width={componentWidth}
              height={componentHeight * 15} // Altezza moltiplicata per un cestello proporzionato
              depth={componentDepth}
              position={position}
              color={componentColor}
            />
          );
        default:
          // Se il tipo non è riconosciuto, usiamo uno scaffale di default
          return (
            <ModuleShelf 
              key={`component-${index}`}
              width={componentWidth}
              depth={componentDepth}
              position={position}
              color={componentColor}
            />
          );
      }
    });
  };
  
  // Genera componenti generici se non abbiamo dati dal DB
  const generateGenericComponents = () => {
    const components = [];
    
    // Scaffali
    const numShelves = Math.max(1, Math.floor(height / 0.4));
    for (let i = 1; i <= numShelves; i++) {
      const yPos = -height/2 + (height * i / (numShelves + 1));
      components.push(
        <ModuleShelf 
          key={`shelf-${i}`}
          width={width - 0.05} 
          depth={depth - 0.05}
          position={[0, yPos, 0]} 
        />
      );
    }
    
    // Divisori (solo se il modulo è abbastanza largo)
    const numDividers = Math.floor(width / 0.7) - 1;
    if (numDividers > 0) {
      for (let i = 1; i <= numDividers; i++) {
        const xPos = -width/2 + (width * i / (numDividers + 1));
        components.push(
          <ModuleDivider 
            key={`divider-${i}`}
            height={height - 0.05} 
            depth={depth - 0.05}
            position={[xPos, 0, 0]} 
          />
        );
      }
    }
    
    // Accessori (solo per moduli a parete)
    if (module.installation_type === 'WALL') {
      // Aggiungi qualche cassetto o anta in base alle dimensioni
      if (width > 0.8 && height > 1.0) {
        // Aggiungi un paio di cassetti nella parte inferiore
        components.push(
          <ModuleDrawer
            key="drawer-1"
            width={width - 0.1}
            height={0.15}
            depth={depth - 0.05}
            position={[0, -height/2 + 0.1, 0]}
          />
        );
        
        components.push(
          <ModuleDrawer
            key="drawer-2"
            width={width - 0.1}
            height={0.15}
            depth={depth - 0.05}
            position={[0, -height/2 + 0.3, 0]}
          />
        );
        
        // Se è abbastanza alto, aggiungi un'anta nella parte superiore
        if (height > 1.5) {
          components.push(
            <ModuleDoor
              key="door-1"
              width={width - 0.1}
              height={0.8}
              position={[0, height/2 - 0.4, depth/2 - 0.01]}
            />
          );
        }
      } else if (width > 0.6) {
        // Per moduli più piccoli, aggiungi solo alcuni ganci o cestelli
        components.push(
          <ModuleBasket
            key="basket-1"
            width={width - 0.1}
            height={0.2}
            depth={depth - 0.05}
            position={[0, 0, 0]}
          />
        );
        
        components.push(
          <ModuleHanger
            key="hanger-1"
            width={width - 0.15}
            position={[0, height/3, 0]}
          />
        );
      }
    }
    
    return components;
  };

  return (
    <group position={modulePosition} ref={meshRef}>
      {/* Struttura esterna del modulo */}
      <Box 
        args={[width, height, depth]} 
        position={[0, 0, 0]}
        userData={{ 
          moduleId: module.id, 
          moduleName: module.module_name,
          moduleType: module.installation_type
        }}
      >
        <meshStandardMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.8} 
          transparent={true}
          opacity={0.95}
        />
      </Box>
      
      {/* Dettagli interni del modulo */}
      {generateComponents()}
    </group>
  );
};

// Componente floor/grid per il rendering
const Floor = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#f0f0f0" />
      <gridHelper args={[30, 30, '#999999', '#999999']} rotation={[Math.PI / 2, 0, 0]} />
    </mesh>
  );
};

// Componente parete per appoggiare i moduli
const Wall = () => {
  return (
    <mesh position={[0, 7.5, -5]} receiveShadow castShadow>
      <boxGeometry args={[30, 15, 0.2]} />
      <meshStandardMaterial color="#e6e6e6" />
    </mesh>
  );
};

// Scene component that contains all the 3D elements
const Scene = ({ modules, environment, lighting }) => {
  const { scene } = useThree();
  
  // Aggiusta intensità luci in base al valore del cursore (0-100)
  const lightIntensity = lighting / 50; // Converte da 0-100 a 0-2
  
  // Genera colori diversi per moduli diversi (palette più professionale)
  const getModuleColor = (index, type) => {
    // Palette per moduli a pavimento (toni caldi)
    const floorColors = ['#e6ccb3', '#d9b38c', '#cca37f', '#bf9270', '#b38463'];
    
    // Palette per moduli a parete (toni freddi)
    const wallColors = ['#b3cce6', '#8cb3d9', '#7f9ccc', '#7087bf', '#6373b3'];
    
    if (type === 'WALL') {
      return wallColors[index % wallColors.length];
    } else {
      return floorColors[index % floorColors.length];
    }
  };
  
  // Posizionamento dei moduli
  const arrangeModules = () => {
    // Raggruppiamo i moduli per tipo (FLOOR o WALL)
    const floorModules = modules.filter(m => m.installation_type === 'FLOOR');
    const wallModules = modules.filter(m => m.installation_type === 'WALL');
    
    const moduleElements = [];
    
    // Disponi moduli a pavimento in semicerchio davanti alla parete
    let floorAngle = -Math.PI / 4; // Inizia da -45 gradi
    const floorRadius = 3; // Raggio del semicerchio
    const floorAngleStep = Math.min(Math.PI / 2 / Math.max(1, floorModules.length), Math.PI / 8);
    
    floorModules.forEach((module, index) => {
      // Calcola larghezza in unità 3D
      const width = module.width / 100;
      
      // Posiziona più copie in base alla quantità
      for (let i = 0; i < module.quantity; i++) {
        // Posizione in coordinate polari (semicerchio)
        const x = floorRadius * Math.sin(floorAngle);
        const z = -floorRadius * Math.cos(floorAngle) - 2; // Offset per stare davanti alla parete
        
        moduleElements.push(
          <Module3D 
            key={`floor-${module.id}-${i}`} 
            module={module} 
            position={[x, 0, z]} 
            color={getModuleColor(index, 'FLOOR')}
            againstWall={false} // I moduli a pavimento non sono contro la parete
          />
        );
        
        // Incrementa angolo per il prossimo modulo
        floorAngle += floorAngleStep;
      }
    });
    
    // Disponi moduli a parete lungo la parete
    let wallXOffset = -4;
    
    wallModules.forEach((module, index) => {
      // Calcola larghezza in unità 3D
      const width = module.width / 100;
      
      // Posiziona più copie in base alla quantità
      for (let i = 0; i < module.quantity; i++) {
        moduleElements.push(
          <Module3D 
            key={`wall-${module.id}-${i}`} 
            module={module} 
            position={[wallXOffset + (width / 2), 0, 0]} 
            color={getModuleColor(index, 'WALL')}
            againstWall={true} // I moduli a parete sono contro la parete
          />
        );
        
        // Incrementa offset per il prossimo modulo
        wallXOffset += width + 0.3; // 0.3 è lo spazio tra i moduli
      }
    });
    
    return moduleElements;
  };
  
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 5, 10]} />
      <OrbitControls enableDamping minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
      
      {/* Lighting based on the selected environment */}
      <ambientLight intensity={lightIntensity * 0.5} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={lightIntensity} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      
      {/* Spotlight per evidenziare i moduli a parete */}
      <spotLight
        position={[0, 8, 5]}
        angle={Math.PI / 4}
        penumbra={0.5}
        intensity={lightIntensity * 1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        target-position={[0, 2, -5]}
      />
      
      {/* Environment based on selection */}
      <Environment preset={environment === 'outdoor' ? 'sunset' : (environment === 'studio' ? 'studio' : 'apartment')} />
      
      {/* Floor */}
      <Floor />
      
      {/* Wall for modules */}
      <Wall />
      
      {/* Modules */}
      {arrangeModules()}
    </>
  );
};

// Main 3D Viewer component
const ModuleViewer3D = ({ 
  modules, 
  environment = 'indoor',
  lighting = 70,
  onSceneReady = () => {}
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const sceneRef = useRef();
  
  useEffect(() => {
    // Simulazione di caricamento
    const timer = setTimeout(() => {
      setIsLoading(false);
      onSceneReady(sceneRef.current);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (modules.length === 0) {
    return (
      <MuiBox 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <Typography color="text.secondary">
          No modules configured yet.
        </Typography>
      </MuiBox>
    );
  }
  
  return (
    <MuiBox sx={{ position: 'relative', height: '100%' }}>
      {isLoading && (
        <MuiBox 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 2
          }}
        >
          <CircularProgress />
        </MuiBox>
      )}
      
      <Canvas
        ref={sceneRef}
        shadows
        gl={{ preserveDrawingBuffer: true }}
        style={{ background: environment === 'studio' ? '#ffffff' : '#87CEEB' }}
      >
        <Scene 
          modules={modules} 
          environment={environment} 
          lighting={lighting} 
        />
      </Canvas>
    </MuiBox>
  );
};

export default ModuleViewer3D;