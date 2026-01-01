import "./style.css";
import * as THREE from "three";

// ========================================
// 定数定義
// ========================================

// カメラ設定
const CAMERA_FOV = 75;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

// ジオメトリ設定
const BOX_WIDTH = 5;
const BOX_HEIGHT = 5;
const BOX_DEPTH = 5;
const BOX_SEGMENTS = 10;
const BOX_INITIAL_POSITION = { x: 0, y: 0.5, z: -15 };
const BOX_INITIAL_ROTATION = { x: 1, y: 1, z: 0 };

const TORUS_RADIUS = 8;
const TORUS_TUBE = 2;
const TORUS_RADIAL_SEGMENTS = 16;
const TORUS_TUBULAR_SEGMENTS = 100;
const TORUS_INITIAL_POSITION = { x: 0, y: 1, z: 10 };

// アニメーション設定
const ANIMATION_RANGES = {
  INTRO: { start: 0, end: 40 },
  ROTATION: { start: 40, end: 60 },
  CAMERA_MOVE: { start: 60, end: 80 },
  FINAL_SPIN: { start: 80, end: 100 }
};

// カメラの初期位置
const CAMERA_DEFAULT_POSITION = { x: 0, y: 1, z: 10 };

// スクロール率
let scrollPercent = 0;

// ========================================
// 初期化
// ========================================

// canvas
const canvas = document.querySelector("#webgl");
if (!canvas) {
  throw new Error("Canvas element with id 'webgl' not found");
}

// シーン
const scene = new THREE.Scene();

// 背景用のテクスチャ
const textureLoader = new THREE.TextureLoader();
const bgTexture = textureLoader.load(
  "bg/bg.jpg",
  undefined, // onLoad
  undefined, // onProgress
  (error) => {
    console.error("背景テクスチャの読み込みに失敗しました:", error);
  }
);
scene.background = bgTexture;

// サイズ
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// カメラ
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  sizes.width / sizes.height,
  CAMERA_NEAR,
  CAMERA_FAR
);

// レンダラー
const renderer = new THREE.WebGLRenderer({
  canvas,
});

// オブジェクトを作成
const boxGeometry = new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH, BOX_SEGMENTS);
const boxMaterial = new THREE.MeshNormalMaterial();
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.set(BOX_INITIAL_POSITION.x, BOX_INITIAL_POSITION.y, BOX_INITIAL_POSITION.z);
box.rotation.set(BOX_INITIAL_ROTATION.x, BOX_INITIAL_ROTATION.y, BOX_INITIAL_ROTATION.z);

const torusGeometry = new THREE.TorusGeometry(
  TORUS_RADIUS,
  TORUS_TUBE,
  TORUS_RADIAL_SEGMENTS,
  TORUS_TUBULAR_SEGMENTS
);
const torusMaterial = new THREE.MeshNormalMaterial();
const torus = new THREE.Mesh(torusGeometry, torusMaterial);
torus.position.set(TORUS_INITIAL_POSITION.x, TORUS_INITIAL_POSITION.y, TORUS_INITIAL_POSITION.z);

scene.add(box, torus);

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);

// ========================================
// ユーティリティ関数
// ========================================

// 線形補間で滑らかに移動させる
function lerp(start, end, alpha) {
  return (1 - alpha) * start + alpha * end;
}

function scalePercent(start, end) {
  return (scrollPercent - start) / (end - start);
}

// カメラをデフォルト位置に設定してボックスを見る
function setCameraToDefault() {
  camera.lookAt(box.position);
  camera.position.set(
    CAMERA_DEFAULT_POSITION.x,
    CAMERA_DEFAULT_POSITION.y,
    CAMERA_DEFAULT_POSITION.z
  );
}

// ========================================
// アニメーション設定
// ========================================

// スクロールアニメーション
const animationScripts = [];

animationScripts.push({
  start: ANIMATION_RANGES.INTRO.start,
  end: ANIMATION_RANGES.INTRO.end,
  function() {
    setCameraToDefault();
    box.position.z = lerp(-15, 2, scalePercent(ANIMATION_RANGES.INTRO.start, ANIMATION_RANGES.INTRO.end));
    torus.position.z = lerp(10, -20, scalePercent(ANIMATION_RANGES.INTRO.start, ANIMATION_RANGES.INTRO.end));
  },
});

animationScripts.push({
  start: ANIMATION_RANGES.ROTATION.start,
  end: ANIMATION_RANGES.ROTATION.end,
  function() {
    setCameraToDefault();
    box.rotation.z = lerp(1, Math.PI, scalePercent(ANIMATION_RANGES.ROTATION.start, ANIMATION_RANGES.ROTATION.end));
  },
});

animationScripts.push({
  start: ANIMATION_RANGES.CAMERA_MOVE.start,
  end: ANIMATION_RANGES.CAMERA_MOVE.end,
  function() {
    camera.lookAt(box.position);
    camera.position.x = lerp(0, -15, scalePercent(ANIMATION_RANGES.CAMERA_MOVE.start, ANIMATION_RANGES.CAMERA_MOVE.end));
    camera.position.y = lerp(1, -15, scalePercent(ANIMATION_RANGES.CAMERA_MOVE.start, ANIMATION_RANGES.CAMERA_MOVE.end));
    camera.position.z = lerp(10, 25, scalePercent(ANIMATION_RANGES.CAMERA_MOVE.start, ANIMATION_RANGES.CAMERA_MOVE.end));
  },
});

animationScripts.push({
  start: ANIMATION_RANGES.FINAL_SPIN.start,
  end: ANIMATION_RANGES.FINAL_SPIN.end,
  function() {
    const targetRotation = Math.PI * 2;
    const progress = scalePercent(ANIMATION_RANGES.FINAL_SPIN.start, ANIMATION_RANGES.FINAL_SPIN.end);
    box.rotation.x = lerp(box.rotation.x, targetRotation, progress);
    box.rotation.y = lerp(box.rotation.y, targetRotation, progress);
  },
});

// アニメーションを開始
function playScrollAnimation() {
  animationScripts.forEach((animation) => {
    if (scrollPercent >= animation.start && scrollPercent <= animation.end)
      animation.function();
  });
}

// ========================================
// イベントリスナー
// ========================================

// ブラウザのスクロール率を取得
const handleScroll = () => {
  scrollPercent =
    (document.documentElement.scrollTop /
      (document.documentElement.scrollHeight -
        document.documentElement.clientHeight)) *
    100;
};
window.addEventListener("scroll", handleScroll);

// ブラウザのリサイズ操作
const handleResize = () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(window.devicePixelRatio);
};
window.addEventListener("resize", handleResize);

// ========================================
// アニメーションループ
// ========================================

const tick = () => {
  window.requestAnimationFrame(tick);
  playScrollAnimation();
  renderer.render(scene, camera);
};

// 初回レンダリング
setCameraToDefault();
renderer.render(scene, camera);

tick();

// ========================================
// クリーンアップ
// ========================================

/**
 * リソースを解放してメモリリークを防ぐ
 * SPAなどでコンポーネントをアンマウントする際に呼び出す
 */
export function cleanup() {
  // イベントリスナーの削除
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleResize);

  // ジオメトリとマテリアルの破棄
  boxGeometry.dispose();
  boxMaterial.dispose();
  torusGeometry.dispose();
  torusMaterial.dispose();

  // レンダラーの破棄
  renderer.dispose();
}
