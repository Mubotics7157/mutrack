import { useState, useRef, useMemo, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";

interface TrajectoryViewer3DProps {
  trajectoryId?: string;
  showConfidence?: boolean;
}

export function TrajectoryViewer3D({
  trajectoryId,
  showConfidence = true,
}: TrajectoryViewer3DProps) {
  const trajectory = useQuery(
    api.physicsModels.getTrajectory,
    trajectoryId ? { trajectoryId: trajectoryId as any } : "skip"
  );

  if (!trajectoryId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        Select a trajectory to view
      </div>
    );
  }

  if (trajectory === undefined) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!trajectory) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        Trajectory not found
      </div>
    );
  }

  // Parse positions
  const positions = useMemo(() => {
    try {
      return JSON.parse(trajectory.positions);
    } catch {
      return [];
    }
  }, [trajectory.positions]);

  return (
    <Canvas>
      <Suspense fallback={null}>
        <Scene3D positions={positions} showConfidence={showConfidence} />
      </Suspense>
    </Canvas>
  );
}

interface Position {
  time: number;
  x: number;
  y: number;
  z: number;
  confidence?: number;
}

interface Scene3DProps {
  positions: Position[];
  showConfidence: boolean;
}

function Scene3D({ positions, showConfidence }: Scene3DProps) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[8, 4, 8]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={30}
        target={[3, 1, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />

      {/* Grid */}
      <Grid
        args={[20, 20]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#444"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Axis Labels */}
      <Text position={[10, 0.1, 0]} fontSize={0.5} color="#888" anchorX="center">
        X (distance)
      </Text>
      <Text position={[0, 5, 0]} fontSize={0.5} color="#888" anchorX="center">
        Y (height)
      </Text>
      <Text position={[0, 0.1, 5]} fontSize={0.5} color="#888" anchorX="center">
        Z
      </Text>

      {/* Shooter Origin */}
      <ShooterMarker />

      {/* Trajectory */}
      {positions.length > 0 && (
        <>
          <TrajectoryArc positions={positions} showConfidence={showConfidence} />
          <TrajectoryPoints positions={positions} />
        </>
      )}
    </>
  );
}

function ShooterMarker() {
  return (
    <group position={[0, 0.5, 0]}>
      {/* Base */}
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.6]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      {/* Shooter tube */}
      <mesh position={[0.3, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
        <meshStandardMaterial color="#667eea" />
      </mesh>
    </group>
  );
}

interface TrajectoryArcProps {
  positions: Position[];
  showConfidence: boolean;
}

function TrajectoryArc({ positions, showConfidence }: TrajectoryArcProps) {
  const curveRef = useRef<THREE.Line>(null);

  // Create smooth curve through points
  const curve = useMemo(() => {
    if (positions.length < 2) return null;

    const points = positions.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );

    return new THREE.CatmullRomCurve3(points);
  }, [positions]);

  const lineGeometry = useMemo(() => {
    if (!curve) return null;

    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return geometry;
  }, [curve]);

  if (!lineGeometry) return null;

  return (
    <line ref={curveRef}>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial
        attach="material"
        color="#667eea"
        linewidth={2}
        transparent
        opacity={0.8}
      />
    </line>
  );
}

interface TrajectoryPointsProps {
  positions: Position[];
}

function TrajectoryPoints({ positions }: TrajectoryPointsProps) {
  // Sample every few points to avoid clutter
  const sampledPositions = useMemo(() => {
    const step = Math.max(1, Math.floor(positions.length / 30));
    return positions.filter((_, i) => i % step === 0);
  }, [positions]);

  return (
    <group>
      {sampledPositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial
            color={getConfidenceColor(pos.confidence || 0.5)}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Ball at apex */}
      {positions.length > 0 && (
        <AnimatedBall positions={positions} />
      )}
    </group>
  );
}

interface AnimatedBallProps {
  positions: Position[];
}

function AnimatedBall({ positions }: AnimatedBallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current || !playing || positions.length < 2) return;

    timeRef.current += delta * 0.5; // Slow motion
    const t = timeRef.current % 1; // Loop

    // Interpolate position
    const idx = t * (positions.length - 1);
    const i = Math.floor(idx);
    const frac = idx - i;

    if (i < positions.length - 1) {
      const p0 = positions[i];
      const p1 = positions[i + 1];

      meshRef.current.position.x = p0.x + (p1.x - p0.x) * frac;
      meshRef.current.position.y = p0.y + (p1.y - p0.y) * frac;
      meshRef.current.position.z = p0.z + (p1.z - p0.z) * frac;
    }
  });

  // Show ball at apex by default
  const apex = positions.reduce(
    (max, p) => (p.y > max.y ? p : max),
    positions[0]
  );

  return (
    <mesh
      ref={meshRef}
      position={[apex?.x || 0, apex?.y || 1, apex?.z || 0]}
      onClick={() => setPlaying(!playing)}
    >
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial color="#f6ad55" />
    </mesh>
  );
}

function getConfidenceColor(confidence: number): string {
  // Green for high confidence, yellow for medium, red for low
  if (confidence > 0.8) return "#48bb78";
  if (confidence > 0.5) return "#ecc94b";
  return "#f56565";
}
