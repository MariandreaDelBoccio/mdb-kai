import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactElement,
} from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type LayerCopy = { name: string; line: string };

type SceneProps = {
  /** Scroll progress 0..1 over the pinned story. */
  progress: MutableRefObject<number>;
  layers: LayerCopy[];
  /** Reduced motion: assembled piece, no timeline, no idle. */
  still?: boolean;
};

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

const T = {
  explode: [0.08, 0.26],
  legendsIn: 0.27,
  legendsOut: [0.455, 0.49],
  rebuild: [0.48, 0.64],
  extras: [0.65, 0.76],
  rise: [0.745, 0.8],
  drop: [0.8, 0.885],
  lid: [0.885, 0.94],
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function paintedTexture(w: number, h: number, paint: Painter) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, canvas, paint };
}

function repaintWhenFontsReady(
  items: {
    tex: THREE.CanvasTexture;
    canvas: HTMLCanvasElement;
    paint: Painter;
  }[],
) {
  if (typeof document === "undefined" || !document.fonts) return;
  document.fonts.ready.then(() => {
    for (const it of items) {
      const ctx = it.canvas.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, it.canvas.width, it.canvas.height);
      it.paint(ctx, it.canvas.width, it.canvas.height);
      it.tex.needsUpdate = true;
    }
  });
}

const DISPLAY = '"Shippori Mincho", "Hiragino Mincho ProN", serif';

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

const BOWL_OUTER: [number, number][] = [
  [0, 0.03],
  [0.4, 0.03],
  [0.42, 0],
  [0.5, 0],
  [0.52, 0.05],
  [0.6, 0.12],
  [0.78, 0.24],
  [0.95, 0.38],
  [1.07, 0.5],
  [1.14, 0.6],
  [1.15, 0.64],
];
const BOWL_INNER: [number, number][] = [
  [1.13, 0.665],
  [1.08, 0.63],
  [0.94, 0.44],
  [0.74, 0.25],
  [0.5, 0.13],
  [0.25, 0.08],
  [0, 0.07],
];

function Bowl() {
  const { geo, map } = useMemo(() => {
    const pts = [...BOWL_OUTER, ...BOWL_INNER].map(
      ([r, y]) => new THREE.Vector2(r, y),
    );
    const geo = new THREE.LatheGeometry(pts, 96);
    const n = pts.length - 1;
    const painted = paintedTexture(16, 512, (ctx, w, h) => {
      const row = (idx: number) => (1 - idx / n) * h;
      ctx.fillStyle = "#f2ebdb";
      ctx.fillRect(0, 0, w, h);
      // inner glaze, a touch cooler
      ctx.fillStyle = "#f6f1e5";
      ctx.fillRect(0, 0, w, row(BOWL_OUTER.length - 0.5));
      // lantern-red band
      ctx.fillStyle = "#a3261a";
      ctx.fillRect(0, row(8.9), w, row(7.2) - row(8.9));
      // hairlines
      ctx.fillStyle = "#1a0f0c";
      ctx.fillRect(0, row(9.35), w, 3);
      ctx.fillRect(0, row(6.95), w, 3);
    });
    return { geo, map: painted.tex };
  }, []);

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial
        map={map}
        roughness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.06}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Broth() {
  const top = useMemo(() => {
    const rand = rng(7);
    return paintedTexture(512, 512, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, "#e6c791");
      g.addColorStop(0.7, "#d3ab72");
      g.addColorStop(1, "#bf9459");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 10 + rand() * 38;
        const s = ctx.createRadialGradient(x, y, 0, x, y, r);
        const light = rand() > 0.5;
        s.addColorStop(
          0,
          light ? "rgba(255,236,200,.28)" : "rgba(150,100,50,.16)",
        );
        s.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = s;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // chili-oil droplets
      for (let i = 0; i < 90; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 3 + rand() * 12;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(214,110,34,${0.35 + rand() * 0.3})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,225,170,.55)";
        ctx.fill();
      }
    }).tex;
  }, []);

  return (
    <mesh position={[0, 0.44, 0]} receiveShadow>
      <cylinderGeometry args={[0.93, 0.93, 0.09, 72, 1]} />
      <meshPhysicalMaterial
        attach="material-0"
        color="#c79b60"
        roughness={0.35}
        clearcoat={0.6}
      />
      <meshPhysicalMaterial
        attach="material-1"
        map={top}
        roughness={0.16}
        clearcoat={1}
        clearcoatRoughness={0.04}
      />
      <meshPhysicalMaterial
        attach="material-2"
        color="#b88b50"
        roughness={0.5}
      />
    </mesh>
  );
}

function buildNoodles() {
  const rand = rng(42);
  const geos: THREE.BufferGeometry[] = [];
  for (let s = 0; s < 30; s++) {
    const pts: THREE.Vector3[] = [];
    let ang = rand() * Math.PI * 2;
    let rad = 0.1 + rand() * 0.55;
    const lift = rand();
    for (let k = 0; k < 16; k++) {
      ang += 0.45 + rand() * 0.9;
      rad += (rand() - 0.5) * 0.32;
      rad = Math.min(0.66, Math.max(0.08, rad));
      const crown = 0.34 * (1 - Math.pow(rad / 0.72, 2)) + 0.03;
      const y =
        crown * (0.35 + 0.65 * lift) +
        Math.sin(k * 1.7 + s) * 0.035 +
        rand() * 0.02;
      pts.push(new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    geos.push(
      new THREE.TubeGeometry(curve, 140, 0.02 + rand() * 0.006, 5, false),
    );
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged ?? new THREE.BufferGeometry();
}

function Noodles() {
  const geo = useMemo(buildNoodles, []);
  return (
    <mesh geometry={geo} position={[0, 0.47, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color="#e9cc79"
        roughness={0.42}
        emissive="#4a3200"
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

function Chashu() {
  const top = useMemo(() => {
    const rand = rng(21);
    return paintedTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = "#5a2f1c";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(
        w / 2,
        h / 2,
        20,
        w / 2,
        h / 2,
        w * 0.46,
      );
      g.addColorStop(0, "#d9a384");
      g.addColorStop(0.8, "#b97a58");
      g.addColorStop(1, "#8a4b32");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // fat spiral
      ctx.strokeStyle = "rgba(240,205,180,.38)";
      ctx.lineCap = "round";
      for (let arm = 0; arm < 2; arm++) {
        ctx.lineWidth = 9 - arm * 3;
        ctx.beginPath();
        for (let t = 0; t < 14; t += 0.1) {
          const r = 14 + t * 14;
          const a = t + arm * Math.PI;
          const x = w / 2 + Math.cos(a) * r * 1.02;
          const y = h / 2 + Math.sin(a) * r * 0.96;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // fibre
      for (let i = 0; i < 160; i++) {
        const x = rand() * w;
        const y = rand() * h;
        ctx.strokeStyle = `rgba(90,45,25,${0.1 + rand() * 0.15})`;
        ctx.lineWidth = 1 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 40, y + (rand() - 0.5) * 40);
        ctx.stroke();
      }
      // soy glaze
      const gl = ctx.createLinearGradient(0, 0, w, h);
      gl.addColorStop(0, "rgba(255,230,200,.24)");
      gl.addColorStop(0.5, "rgba(255,230,200,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, w, h);
    }).tex;
  }, []);

  const slice = (
    <mesh castShadow receiveShadow scale={[1, 1, 0.86]}>
      <cylinderGeometry args={[0.43, 0.43, 0.075, 56, 1]} />
      <meshStandardMaterial
        attach="material-0"
        color="#5d3220"
        roughness={0.55}
      />
      <meshPhysicalMaterial
        attach="material-1"
        map={top}
        roughness={0.38}
        clearcoat={0.5}
        clearcoatRoughness={0.3}
      />
      <meshStandardMaterial
        attach="material-2"
        color="#5d3220"
        roughness={0.6}
      />
    </mesh>
  );

  return (
    <group>
      <group position={[-0.28, 0.78, -0.52]} rotation={[1.0, 0.25, 0.1]}>
        {slice}
      </group>
      <group position={[0.18, 0.74, -0.62]} rotation={[0.95, -0.15, -0.18]}>
        <mesh castShadow receiveShadow scale={[0.95, 1, 0.82]}>
          <cylinderGeometry args={[0.41, 0.41, 0.07, 56, 1]} />
          <meshStandardMaterial
            attach="material-0"
            color="#5d3220"
            roughness={0.55}
          />
          <meshPhysicalMaterial
            attach="material-1"
            map={top}
            roughness={0.38}
            clearcoat={0.5}
            clearcoatRoughness={0.3}
          />
          <meshStandardMaterial
            attach="material-2"
            color="#5d3220"
            roughness={0.6}
          />
        </mesh>
      </group>
    </group>
  );
}

function EggHalf({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const face = useMemo(
    () =>
      paintedTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = "#c9965b";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f3ecdc";
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2);
        ctx.fill();
        const y = ctx.createRadialGradient(
          w / 2,
          h / 2,
          6,
          w / 2,
          h / 2,
          w * 0.27,
        );
        y.addColorStop(0, "#f7bd4a");
        y.addColorStop(0.65, "#ee9a26");
        y.addColorStop(1, "#d9781a");
        ctx.fillStyle = y;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.27, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,240,200,.55)";
        ctx.beginPath();
        ctx.ellipse(w * 0.44, h * 0.43, 26, 16, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }).tex,
    [],
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh scale={[0.3, 0.26, 0.4]} castShadow receiveShadow>
        <sphereGeometry
          args={[1, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        <meshPhysicalMaterial
          color="#b88652"
          roughness={0.3}
          clearcoat={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        scale={[0.3, 0.4, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshPhysicalMaterial
          map={face}
          roughness={0.25}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
        />
      </mesh>
    </group>
  );
}

function Egg() {
  return (
    <group>
      <EggHalf position={[0.5, 0.64, 0.32]} rotation={[-0.25, 0.4, 0.12]} />
      <EggHalf position={[0.78, 0.6, 0.02]} rotation={[-0.2, -0.3, -0.1]} />
    </group>
  );
}

function Garnish() {
  const nori = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.62, 0.82, 14, 18);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 10) * 0.012 + Math.sin(y * 8 + x * 3) * 0.014);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const rings = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = rings.current;
    if (!mesh) return;
    const rand = rng(99);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    for (let i = 0; i < 38; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.5;
      const y = 0.47 + 0.34 * (1 - Math.pow(r / 0.72, 2)) * 0.85 + 0.06;
      e.set((rand() - 0.5) * 0.7, rand() * Math.PI, (rand() - 0.5) * 0.7);
      q.setFromEuler(e);
      const s = 0.8 + rand() * 0.5;
      m.compose(
        new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
        q,
        new THREE.Vector3(s, s, s),
      );
      mesh.setMatrixAt(i, m);
      c.setHSL(0.25 + rand() * 0.04, 0.55 + rand() * 0.2, 0.42 + rand() * 0.14);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <mesh
        geometry={nori}
        position={[0.55, 0.92, -0.62]}
        rotation={[-0.12, -0.5, 0.08]}
        castShadow
      >
        <meshStandardMaterial
          color="#111d15"
          roughness={0.78}
          emissive="#06150b"
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <instancedMesh ref={rings} args={[undefined, undefined, 38]} castShadow>
        <torusGeometry args={[0.04, 0.012, 6, 14]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

type LayerDef = {
  id: string;
  /** Vertical travel when exploded (world units). */
  dy: number;
  /** Where the legend sits, relative to the layer. */
  anchorX: number;
  labelY: number;
  node: ReactElement;
};

const LAYER_DEFS: LayerDef[] = [
  { id: "bowl", dy: -1.15, anchorX: 1.5, labelY: 0.3, node: <Bowl /> },
  { id: "broth", dy: -0.4, anchorX: 1.2, labelY: 0.46, node: <Broth /> },
  { id: "noodles", dy: 0.4, anchorX: 1.0, labelY: 0.62, node: <Noodles /> },
  { id: "chashu", dy: 1.2, anchorX: 1.05, labelY: 0.78, node: <Chashu /> },
  { id: "egg", dy: 1.95, anchorX: 1.2, labelY: 0.66, node: <Egg /> },
  { id: "garnish", dy: 2.75, anchorX: 1.0, labelY: 0.9, node: <Garnish /> },
];

/* ------------------------------------------------------------------ */
/* Extras                                                              */
/* ------------------------------------------------------------------ */

function Narutomaki() {
  const top = useMemo(
    () =>
      paintedTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = "#f4efe8";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#e8789b";
        ctx.lineWidth = 16;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let t = 0; t < 11; t += 0.08) {
          const r = 6 + t * 10;
          const x = w / 2 + Math.cos(t) * r;
          const y = h / 2 + Math.sin(t) * r;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
        ctx.stroke();
      }).tex,
    [],
  );
  return (
    <mesh castShadow>
      <cylinderGeometry args={[0.24, 0.24, 0.05, 48, 1]} />
      <meshStandardMaterial
        attach="material-0"
        color="#f1ebe0"
        roughness={0.5}
      />
      <meshStandardMaterial attach="material-1" map={top} roughness={0.4} />
      <meshStandardMaterial
        attach="material-2"
        color="#f1ebe0"
        roughness={0.5}
      />
    </mesh>
  );
}

function Menma() {
  const items = useMemo(() => {
    const rand = rng(5);
    return Array.from({ length: 6 }, (_, i) => ({
      p: [(rand() - 0.5) * 0.16, i * 0.028, (rand() - 0.5) * 0.14] as [
        number,
        number,
        number,
      ],
      r: (rand() - 0.5) * 1.2,
    }));
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} rotation={[0, it.r, 0]} castShadow>
          <boxGeometry args={[0.3, 0.03, 0.08]} />
          <meshStandardMaterial color="#c99a58" roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Chopsticks() {
  return (
    <group>
      {[-0.05, 0.05].map((z, i) => (
        <group
          key={i}
          position={[0, 0, z]}
          rotation={[0, i === 0 ? 0.02 : -0.02, 0]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.014, 0.021, 2.3, 12]} />
            <meshStandardMaterial color="#b98a55" roughness={0.5} />
          </mesh>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            position={[0.78, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.0205, 0.022, 0.7, 12]} />
            <meshPhysicalMaterial
              color="#7d1b12"
              roughness={0.25}
              clearcoat={1}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Takeaway box                                                        */
/* ------------------------------------------------------------------ */

const BOX_W = 2.7;
const BOX_H = 1.3;
const BOX_T = 0.06;

function useBoxTextures() {
  return useMemo(() => {
    const rand = rng(3);
    const speckle = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = "#efe4cc";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3500; i++) {
        ctx.fillStyle = `rgba(120,90,50,${0.03 + rand() * 0.06})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
      }
    };
    const wall = paintedTexture(1024, 512, (ctx, w, h) => {
      speckle(ctx, w, h);
      ctx.fillStyle = "#a3261a";
      ctx.fillRect(0, h * 0.72, w, h * 0.12);
      ctx.fillStyle = "#1a0f0c";
      ctx.textBaseline = "alphabetic";
      ctx.font = `600 190px ${DISPLAY}`;
      ctx.fillText("KAI", w * 0.08, h * 0.5);
      ctx.font = `500 54px ${DISPLAY}`;
      ctx.fillText("ラーメン", w * 0.08, h * 0.64);
    });
    const lid = paintedTexture(1024, 1024, (ctx, w, h) => {
      speckle(ctx, w, h);
      ctx.fillStyle = "#a3261a";
      ctx.fillRect(0, h * 0.78, w, h * 0.09);
      ctx.fillStyle = "#1a0f0c";
      ctx.textAlign = "center";
      ctx.font = `600 330px ${DISPLAY}`;
      ctx.fillText("KAI", w / 2, h * 0.5);
      ctx.font = `500 70px ${DISPLAY}`;
      ctx.fillText("ラーメン", w / 2, h * 0.64);
    });
    repaintWhenFontsReady([wall, lid]);
    return { wall: wall.tex, lid: lid.tex };
  }, []);
}

function BoxShell({
  lidRef,
}: {
  lidRef: MutableRefObject<THREE.Group | null>;
}) {
  const { wall, lid } = useBoxTextures();
  const paper = <meshStandardMaterial map={wall} roughness={0.85} />;
  const half = BOX_W / 2;
  return (
    <group>
      <mesh position={[0, BOX_T / 2, 0]} receiveShadow>
        <boxGeometry args={[BOX_W, BOX_T, BOX_W]} />
        <meshStandardMaterial color="#e6d9bd" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={`z${s}`}
          position={[0, BOX_H / 2, (half - BOX_T / 2) * s]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX_W, BOX_H, BOX_T]} />
          {paper}
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`x${s}`}
          position={[(half - BOX_T / 2) * s, BOX_H / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX_T, BOX_H, BOX_W - BOX_T * 2]} />
          {paper}
        </mesh>
      ))}
      <group ref={lidRef} position={[0, BOX_H, -half]}>
        <mesh position={[0, BOX_T / 2, half]} receiveShadow>
          <boxGeometry args={[BOX_W, BOX_T, BOX_W]} />
          <meshStandardMaterial
            attach="material-0"
            color="#e6d9bd"
            roughness={0.9}
          />
          <meshStandardMaterial
            attach="material-1"
            color="#e6d9bd"
            roughness={0.9}
          />
          <meshStandardMaterial attach="material-2" map={lid} roughness={0.8} />
          <meshStandardMaterial
            attach="material-3"
            color="#e6d9bd"
            roughness={0.9}
          />
          <meshStandardMaterial
            attach="material-4"
            color="#e6d9bd"
            roughness={0.9}
          />
          <meshStandardMaterial
            attach="material-5"
            color="#e6d9bd"
            roughness={0.9}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Steam                                                               */
/* ------------------------------------------------------------------ */

function Steam({
  groupRef,
}: {
  groupRef: MutableRefObject<THREE.Group | null>;
}) {
  const map = useMemo(
    () =>
      paintedTexture(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(
          w / 2,
          h / 2,
          0,
          w / 2,
          h / 2,
          w / 2,
        );
        g.addColorStop(0, "rgba(255,246,232,.9)");
        g.addColorStop(1, "rgba(255,246,232,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }).tex,
    [],
  );
  return (
    <group ref={groupRef} position={[0, 0.7, 0]}>
      {Array.from({ length: 7 }, (_, i) => (
        <sprite key={i}>
          <spriteMaterial
            map={map}
            transparent
            depthWrite={false}
            opacity={0}
          />
        </sprite>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Choreography                                                        */
/* ------------------------------------------------------------------ */

type LayerRef = { pos: THREE.Group | null; yaw: THREE.Group | null };
type LabelRefs = MutableRefObject<(HTMLDivElement | null)[]>;

const ANCHOR = new THREE.Vector3();

function Piece({
  progress,
  still,
  labels,
}: SceneProps & { labels: LabelRefs }) {
  const { camera, size } = useThree();
  const smooth = useRef(0);
  const root = useRef<THREE.Group>(null);
  const piece = useRef<THREE.Group>(null);
  const boxGroup = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group | null>(null);
  const shadow = useRef<THREE.Group>(null);
  const steam = useRef<THREE.Group | null>(null);
  const extrasYaw = useRef<THREE.Group>(null);
  const naruto = useRef<THREE.Group>(null);
  const menma = useRef<THREE.Group>(null);
  const sticks = useRef<THREE.Group>(null);
  const layerRefs = useRef<LayerRef[]>(
    LAYER_DEFS.map(() => ({ pos: null, yaw: null })),
  );

  useFrame((state, dt) => {
    const target = still ? 0 : progress.current;
    smooth.current +=
      (target - smooth.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 7));
    const p = smooth.current;
    const time = state.clock.elapsedTime;
    const aspect = size.width / size.height;
    const portrait = aspect < 0.9;
    const spread = portrait ? 1.3 : 1;

    const explodeSeg = seg(p, T.explode[0], T.explode[1]);
    const rebuildSeg = seg(p, T.rebuild[0], T.rebuild[1]);
    const eMain = ease(explodeSeg) * (1 - ease(rebuildSeg));
    const extrasSeg = seg(p, T.extras[0], T.extras[1]);
    const rise = easeOut(seg(p, T.rise[0], T.rise[1]));
    const drop = ease(seg(p, T.drop[0], T.drop[1]));
    const lidSeg = ease(seg(p, T.lid[0], T.lid[1]));

    const idle = still
      ? 0
      : Math.sin(time * 0.45) * 0.1 * (1 - eMain) * (1 - rise);
    const yaw = -0.5 + 0.75 * eMain + idle + 0.2 * drop;

    // layers
    layerRefs.current.forEach((ref, i) => {
      const up = ease(clamp01((explodeSeg - (5 - i) * 0.07) / 0.65));
      const down = ease(clamp01((rebuildSeg - i * 0.07) / 0.65));
      const e = up * (1 - down);
      if (ref.pos) ref.pos.position.y = e * LAYER_DEFS[i].dy * spread;
      if (ref.yaw) ref.yaw.rotation.y = yaw + e * (i % 2 ? 0.28 : -0.28);
      const label = labels.current[i];
      if (label) {
        const inA = T.legendsIn + i * 0.018;
        const op =
          seg(p, inA, inA + 0.04) *
          (1 - seg(p, T.legendsOut[0], T.legendsOut[1]));
        label.style.opacity = String(op);
        label.style.visibility = op > 0.001 ? "visible" : "hidden";
        label.style.setProperty("--shift", `${(1 - op) * -14}px`);
      }
    });

    // extras
    if (extrasYaw.current) extrasYaw.current.rotation.y = yaw;
    const fly = (
      g: THREE.Group | null,
      t: number,
      from: [number, number, number],
      to: [number, number, number],
      rFrom: [number, number, number],
      rTo: [number, number, number],
    ) => {
      if (!g) return;
      const k = easeOut(t);
      g.visible = t > 0.001;
      g.position.set(
        lerp(from[0], to[0], k),
        lerp(from[1], to[1], k) + Math.sin(k * Math.PI) * 0.7,
        lerp(from[2], to[2], k),
      );
      g.rotation.set(
        lerp(rFrom[0], rTo[0], k),
        lerp(rFrom[1], rTo[1], k),
        lerp(rFrom[2], rTo[2], k),
      );
      g.scale.setScalar(lerp(0.4, 1, k));
    };
    fly(
      naruto.current,
      seg(extrasSeg, 0, 0.7),
      [-3.4, 3.4, 1.6],
      [-0.55, 0.7, 0.45],
      [0.8, 1.6, 0.9],
      [0.62, 0.3, 0],
    );
    fly(
      menma.current,
      seg(extrasSeg, 0.15, 0.85),
      [3.4, 3.2, 1.2],
      [0.2, 0.8, 0.5],
      [0.6, -1.2, 0.5],
      [0, 0.2, 0],
    );
    fly(
      sticks.current,
      seg(extrasSeg, 0.3, 1),
      [0.4, 4.2, 3.2],
      [0.1, 0.72, 0.95],
      [0.5, -0.9, 0.6],
      [0, -0.35, 0],
    );

    // box + drop
    const boxY = lerp(-7, -0.9, rise);
    if (boxGroup.current) {
      boxGroup.current.position.y = boxY;
      boxGroup.current.visible = rise > 0.001;
      boxGroup.current.rotation.y = -0.28 * rise;
    }
    if (lid.current) lid.current.rotation.x = lerp(-1.95, 0, lidSeg);
    if (piece.current) {
      piece.current.position.y = -0.84 * drop;
      piece.current.scale.setScalar(lerp(1, 0.8, drop));
    }
    if (shadow.current) shadow.current.position.y = lerp(0.001, -0.9, rise);

    // steam
    if (steam.current) {
      const base = (1 - eMain) * (1 - drop) * (still ? 0.16 : 0.2);
      steam.current.children.forEach((child, i) => {
        const s = child as THREE.Sprite;
        const cycle = (((time * 0.12 + i / 7) % 1) + 1) % 1;
        s.position.set(
          Math.sin(i * 2.1 + time * 0.3) * 0.35,
          cycle * 1.5,
          Math.cos(i * 1.7) * 0.25,
        );
        const sc = 0.5 + cycle * 0.9;
        s.scale.set(sc, sc, 1);
        (s.material as THREE.SpriteMaterial).opacity =
          base * Math.sin(cycle * Math.PI);
      });
    }

    // camera
    const cam = camera as THREE.PerspectiveCamera;
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const narrow = aspect < 1.4;
    const needH = lerp(lerp(3.6, 7.2 * (portrait ? 1.25 : 1), eMain), 6.4, rise);
    const needW = lerp(
      lerp(3.4, portrait ? 4.7 : narrow ? 5.2 : 4.6, eMain),
      portrait ? 4.6 : 5.8,
      rise,
    );
    const dist = Math.max(needH / (2 * tan), needW / (2 * tan * aspect));
    const elev = (lerp(lerp(32, 20, eMain), 30, rise) * Math.PI) / 180;
    const ty = lerp(lerp(0.5, portrait ? 1.7 : 1.2, eMain), -0.65, rise);
    cam.position.set(0, ty + dist * Math.sin(elev), dist * Math.cos(elev));
    cam.lookAt(0, ty, 0);
    const shift = (portrait ? 0.21 : narrow ? 0.09 : 0) * eMain;
    if (root.current) {
      root.current.position.x = -2 * dist * tan * aspect * shift * (1 - rise);
      root.current.updateMatrixWorld(true);
    }
    cam.updateMatrixWorld();

    // legends: project each layer anchor into the DOM overlay
    layerRefs.current.forEach((ref, i) => {
      const label = labels.current[i];
      if (!label || !ref.pos) return;
      ANCHOR.set(LAYER_DEFS[i].anchorX, LAYER_DEFS[i].labelY, 0);
      ref.pos.localToWorld(ANCHOR);
      ANCHOR.project(cam);
      const x = (ANCHOR.x * 0.5 + 0.5) * size.width;
      const y = (-ANCHOR.y * 0.5 + 0.5) * size.height;
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  });

  return (
    <group ref={root}>
      <group ref={shadow}>
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.5}
          scale={11}
          blur={2.8}
          far={9}
          color="#2a0905"
        />
      </group>

      <group ref={piece}>
        {LAYER_DEFS.map((def, i) => (
          <group
            key={def.id}
            ref={(g) => {
              layerRefs.current[i].pos = g;
            }}
          >
            <group
              ref={(g) => {
                layerRefs.current[i].yaw = g;
              }}
            >
              {def.node}
            </group>
          </group>
        ))}

        <group ref={extrasYaw}>
          <group ref={naruto} visible={false}>
            <Narutomaki />
          </group>
          <group ref={menma} visible={false}>
            <Menma />
          </group>
          <group ref={sticks} visible={false}>
            <Chopsticks />
          </group>
        </group>

        <Steam groupRef={steam} />
      </group>

      <group ref={boxGroup} visible={false}>
        <BoxShell lidRef={lid} />
      </group>
    </group>
  );
}

export function RamenScene(props: SceneProps) {
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  return (
    <>
      <Canvas
        dpr={[1, 1.75]}
        shadows
        camera={{ fov: 30, near: 0.1, far: 80, position: [0, 3.2, 6.4] }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[3.5, 7, 4]}
          intensity={2.4}
          color="#fff1dc"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={7}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0004}
        />
        <Environment resolution={256} environmentIntensity={0.9}>
          <Lightformer
            form="rect"
            intensity={4}
            position={[0, 6, 2]}
            scale={[10, 4, 1]}
            rotation-x={Math.PI / 2}
            color="#fff0dc"
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            position={[-6, 2, 3]}
            scale={[4, 6, 1]}
            color="#ffd9b0"
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[6, 3, -2]}
            scale={[4, 5, 1]}
            color="#ffb59a"
          />
          <Lightformer
            form="ring"
            intensity={2}
            position={[0, 3, -6]}
            scale={6}
            color="#ffd2a8"
          />
          <Lightformer
            form="rect"
            intensity={3}
            position={[0, 1, 7]}
            scale={[8, 3, 1]}
            color="#ffe2c4"
          />
        </Environment>
        <Piece {...props} labels={labels} />
      </Canvas>
      <div className="legends">
        {LAYER_DEFS.map((def, i) => (
          <div
            key={def.id}
            className="legend-anchor"
            ref={(el) => {
              labels.current[i] = el;
            }}
          >
            <div className="legend">
              <div>
                <span className="legend-name">{props.layers[i]?.name}</span>
                <span className="legend-line">{props.layers[i]?.line}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
