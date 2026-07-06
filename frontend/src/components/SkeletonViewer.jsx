import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Soft glowing highlight to represent swelling/edema/effusion, shaped to
// hug the affected bone rather than floating as a plain sphere
function SwellingGlow({ position, scale = [0.15, 0.15, 0.15] }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.set(scale[0] * pulse, scale[1] * pulse, scale[2] * pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshStandardMaterial
        color="#FFEB3B"
        emissive="#FFEB3B"
        emissiveIntensity={1.1}
        transparent
        opacity={0.45}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

// Splits a mesh's geometry into two REAL, separate geometries based on
// world-space Y position of each triangle's centroid. This is a genuine
// CPU-side split (not a render-time clipping trick), so the two halves
// can be freely moved/rotated afterward with no visual artifacts.
function splitMeshGeometry(mesh, worldSplitY) {
  const geometry = mesh.geometry;
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const index = geometry.index;

  mesh.updateMatrixWorld(true);

  const upperPositions = [];
  const upperNormals = [];
  const lowerPositions = [];
  const lowerNormals = [];

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const worldA = new THREE.Vector3(), worldB = new THREE.Vector3(), worldC = new THREE.Vector3();

  const triCount = index ? index.count / 3 : posAttr.count / 3;
  const getIndex = (i) => (index ? index.getX(i) : i);

  for (let t = 0; t < triCount; t++) {
    const ia = getIndex(t * 3);
    const ib = getIndex(t * 3 + 1);
    const ic = getIndex(t * 3 + 2);

    vA.fromBufferAttribute(posAttr, ia);
    vB.fromBufferAttribute(posAttr, ib);
    vC.fromBufferAttribute(posAttr, ic);

    worldA.copy(vA).applyMatrix4(mesh.matrixWorld);
    worldB.copy(vB).applyMatrix4(mesh.matrixWorld);
    worldC.copy(vC).applyMatrix4(mesh.matrixWorld);

    const centroidY = (worldA.y + worldB.y + worldC.y) / 3;
    const targetPositions = centroidY >= worldSplitY ? upperPositions : lowerPositions;
    const targetNormals = centroidY >= worldSplitY ? upperNormals : lowerNormals;

    [ia, ib, ic].forEach((idx) => {
      targetPositions.push(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx));
      if (normAttr) targetNormals.push(normAttr.getX(idx), normAttr.getY(idx), normAttr.getZ(idx));
    });
  }

  const buildGeometry = (positions, normals) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length === positions.length) {
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geo.computeVertexNormals();
    }
    return geo;
  };

  return {
    upperGeometry: buildGeometry(upperPositions, upperNormals),
    lowerGeometry: buildGeometry(lowerPositions, lowerNormals),
  };
}

function SkeletonModel({ highlightedBones = [], color = '#FFA726', hasFracture, hasSwelling, structure, controlsRef }) {
  const { scene } = useGLTF('/models/skeleton.glb');
  const { camera } = useThree();
  const [swellingCenter, setSwellingCenter] = useState(null);
  const [swellingScale, setSwellingScale] = useState([0.15, 0.15, 0.15]);
  const fractureMeshRefs = useRef([]);

  useEffect(() => {
    const targetMeshes = [];

    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'Cube') {
          child.visible = false;
          return;
        }

        child.material = child.material.clone();
        child.visible = true;

        if (highlightedBones.includes(child.name)) {
          child.material.color.set(color);
          child.material.emissive.set(color);
          child.material.emissiveIntensity = 0.3;
          targetMeshes.push(child);
        } else {
          child.material.color.set('#d8d0c0');
          child.material.emissive.set('black');
        }
      }
    });

    const objectsToFit = targetMeshes.length > 0 ? targetMeshes : [scene];

    const box = new THREE.Box3();
    objectsToFit.forEach((obj) => box.expandByObject(obj));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const distance = targetMeshes.length > 0
      ? Math.max(maxDim * 3, 0.5)
      : maxDim * 1.5;

    camera.position.set(center.x, center.y + distance * 0.4, center.z + distance);

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }

    // helper: pick the bone whose name best matches the extracted structure text
    const pickPrimaryBone = () => {
      const structureLower = (structure || '').toLowerCase();
      const lastWord = structureLower.split(' ').pop();
      let primary = targetMeshes.find((m) => lastWord && m.name.toLowerCase().includes(lastWord));
      if (!primary) primary = targetMeshes[0];
      return primary;
    };

    if (targetMeshes.length > 0 && hasSwelling) {
      const swellBone = pickPrimaryBone();
      const swellBox = new THREE.Box3().setFromObject(swellBone);
      const swellCenter = swellBox.getCenter(new THREE.Vector3());

      // measure thickness in the bone's own LOCAL space (before its world
      // rotation is applied) - a world-space axis-aligned box is unreliable
      // here because these bones sit at diagonal angles, so their length
      // can spill onto all three world axes at once
      swellBone.geometry.computeBoundingBox();
      const localBox = swellBone.geometry.boundingBox;
      const localSize = localBox.getSize(new THREE.Vector3());
      const worldScale = new THREE.Vector3();
      swellBone.getWorldScale(worldScale);
      const thickness = Math.min(
        localSize.x * worldScale.x,
        localSize.y * worldScale.y,
        localSize.z * worldScale.z
      );
      const r = Math.max(thickness * 1.3, 0.02);

      setSwellingCenter(swellCenter.clone());
      setSwellingScale([r, r, r]);
    } else {
      setSwellingCenter(null);
    }

    // clean up any previous fracture split meshes before creating new ones
    fractureMeshRefs.current.forEach(({ mesh, parent }) => parent.remove(mesh));
    fractureMeshRefs.current = [];

    if (hasFracture && targetMeshes.length > 0) {
      const primaryBone = pickPrimaryBone();

      const boneBox = new THREE.Box3().setFromObject(primaryBone);
      const boneCenter = boneBox.getCenter(new THREE.Vector3());
      const boneSize = boneBox.getSize(new THREE.Vector3());
      const gap = Math.max(boneSize.x, boneSize.y, boneSize.z) * 0.15;

      const { upperGeometry, lowerGeometry } = splitMeshGeometry(primaryBone, boneCenter.y);

      const upperMesh = new THREE.Mesh(upperGeometry, primaryBone.material.clone());
      upperMesh.position.copy(primaryBone.position);
      upperMesh.rotation.copy(primaryBone.rotation);
      upperMesh.scale.copy(primaryBone.scale);
      upperMesh.translateY(gap / 2);
      upperMesh.rotateZ(0.08);

      const lowerMesh = new THREE.Mesh(lowerGeometry, primaryBone.material.clone());
      lowerMesh.position.copy(primaryBone.position);
      lowerMesh.rotation.copy(primaryBone.rotation);
      lowerMesh.scale.copy(primaryBone.scale);
      lowerMesh.translateY(-gap / 2);
      lowerMesh.rotateZ(-0.08);

      primaryBone.visible = false;
      primaryBone.parent.add(upperMesh);
      primaryBone.parent.add(lowerMesh);

      fractureMeshRefs.current = [
        { mesh: upperMesh, parent: primaryBone.parent },
        { mesh: lowerMesh, parent: primaryBone.parent },
      ];
    }

    return () => {
      fractureMeshRefs.current.forEach(({ mesh, parent }) => parent.remove(mesh));
      fractureMeshRefs.current = [];
    };
  }, [scene, highlightedBones, color, hasFracture, hasSwelling, structure, camera, controlsRef]);

  return (
    <>
      <primitive object={scene} />
      {swellingCenter && hasSwelling && (
        <SwellingGlow position={swellingCenter} scale={swellingScale} />
      )}
    </>
  );
}

export default function SkeletonViewer({ highlightedBones, color, hasFracture, hasSwelling, structure }) {
  const controlsRef = useRef();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <SkeletonModel
            highlightedBones={highlightedBones || []}
            color={color}
            hasFracture={hasFracture}
            hasSwelling={hasSwelling}
            structure={structure}
            controlsRef={controlsRef}
          />
        </Suspense>
        <OrbitControls ref={controlsRef} />
      </Canvas>
    </div>
  );
}