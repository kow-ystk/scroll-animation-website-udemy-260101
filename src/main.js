import "./style.css";
import * as THREE from "three";

// ========================================
// 定数定義
// ========================================

/** カメラの視野角（度） */
const CAMERA_FOV = 75;
/** カメラの最小描画距離 */
const CAMERA_NEAR = 0.1;
/** カメラの最大描画距離 */
const CAMERA_FAR = 1000;

/** ボックスの幅 */
const BOX_WIDTH = 5;
/** ボックスの高さ */
const BOX_HEIGHT = 5;
/** ボックスの奥行き */
const BOX_DEPTH = 5;
/** ボックスの分割数 */
const BOX_SEGMENTS = 10;
/** ボックスの初期位置 */
const BOX_INITIAL_POSITION = { x: 0, y: 0.5, z: -15 };
/** ボックスの初期回転角（ラジアン） */
const BOX_INITIAL_ROTATION = { x: 1, y: 1, z: 0 };

/** トーラスの半径 */
const TORUS_RADIUS = 8;
/** トーラスのチューブ半径 */
const TORUS_TUBE = 2;
/** トーラスの放射方向の分割数 */
const TORUS_RADIAL_SEGMENTS = 16;
/** トーラスのチューブ方向の分割数 */
const TORUS_TUBULAR_SEGMENTS = 100;
/** トーラスの初期位置 */
const TORUS_INITIAL_POSITION = { x: 0, y: 1, z: 10 };

/**
 * アニメーションの実行範囲定義（スクロール率：0-100）
 * @type {Object.<string, {start: number, end: number}>}
 */
const ANIMATION_RANGES = {
  /** イントロアニメーション：オブジェクトが手前に移動 */
  INTRO: { start: 0, end: 40 },
  /** 回転アニメーション：ボックスがZ軸回転 */
  ROTATION: { start: 40, end: 60 },
  /** カメラ移動アニメーション：カメラが斜め下に移動 */
  CAMERA_MOVE: { start: 60, end: 80 },
  /** 最終回転アニメーション：ボックスがXY軸で高速回転 */
  FINAL_SPIN: { start: 80, end: 100 },
};

/** カメラのデフォルト位置 */
const CAMERA_DEFAULT_POSITION = { x: 0, y: 1, z: 10 };

/**
 * 現在のスクロール進捗率（0-100）
 * @type {number}
 */
let scrollPercent = 0;

// ========================================
// 初期化
// ========================================

/** WebGLレンダリング用のCanvas要素 */
const canvas = document.querySelector("#webgl");
if (!canvas) {
  throw new Error("Canvas element with id 'webgl' not found");
}

/** Three.jsのシーン */
const scene = new THREE.Scene();

/** テクスチャローダー */
const textureLoader = new THREE.TextureLoader();
/** 背景用のテクスチャ */
const bgTexture = textureLoader.load(
  "bg.jpg",
  undefined, // onLoad
  undefined, // onProgress
  (error) => {
    console.error("背景テクスチャの読み込みに失敗しました:", error);
  }
);
scene.background = bgTexture;

/**
 * レンダリングサイズ
 * @type {{width: number, height: number}}
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/** Three.jsのパースペクティブカメラ */
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  sizes.width / sizes.height,
  CAMERA_NEAR,
  CAMERA_FAR
);

/** WebGLレンダラー */
const renderer = new THREE.WebGLRenderer({
  canvas,
});

/** ボックスのジオメトリ */
const boxGeometry = new THREE.BoxGeometry(
  BOX_WIDTH,
  BOX_HEIGHT,
  BOX_DEPTH,
  BOX_SEGMENTS
);
/** ボックスのマテリアル（法線マテリアル） */
const boxMaterial = new THREE.MeshNormalMaterial();
/** ボックスメッシュ */
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.set(
  BOX_INITIAL_POSITION.x,
  BOX_INITIAL_POSITION.y,
  BOX_INITIAL_POSITION.z
);
box.rotation.set(
  BOX_INITIAL_ROTATION.x,
  BOX_INITIAL_ROTATION.y,
  BOX_INITIAL_ROTATION.z
);

/** トーラスのジオメトリ */
const torusGeometry = new THREE.TorusGeometry(
  TORUS_RADIUS,
  TORUS_TUBE,
  TORUS_RADIAL_SEGMENTS,
  TORUS_TUBULAR_SEGMENTS
);
/** トーラスのマテリアル（法線マテリアル） */
const torusMaterial = new THREE.MeshNormalMaterial();
/** トーラスメッシュ */
const torus = new THREE.Mesh(torusGeometry, torusMaterial);
torus.position.set(
  TORUS_INITIAL_POSITION.x,
  TORUS_INITIAL_POSITION.y,
  TORUS_INITIAL_POSITION.z
);

scene.add(box, torus);

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 線形補間（Linear Interpolation）で2つの値の間を滑らかに補間する
 * @param {number} start - 開始値
 * @param {number} end - 終了値
 * @param {number} alpha - 補間係数（0-1）
 * @returns {number} 補間された値
 */
function lerp(start, end, alpha) {
  return (1 - alpha) * start + alpha * end;
}

/**
 * 現在のスクロール率を指定範囲内での進捗率（0-1）に正規化する
 * @param {number} start - 範囲の開始値（%）
 * @param {number} end - 範囲の終了値（%）
 * @returns {number} 正規化された進捗率（0-1）
 */
function scalePercent(start, end) {
  return (scrollPercent - start) / (end - start);
}

/**
 * カメラをデフォルト位置に設定し、ボックスの方向を向かせる
 */
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

/**
 * スクロール連動アニメーションの定義配列
 * 各アニメーションはスクロール範囲（start-end）と実行関数を持つ
 * @type {Array<{start: number, end: number, function: Function}>}
 */
const animationScripts = [];

animationScripts.push({
  start: ANIMATION_RANGES.INTRO.start,
  end: ANIMATION_RANGES.INTRO.end,
  function() {
    setCameraToDefault();
    box.position.z = lerp(
      -15,
      2,
      scalePercent(ANIMATION_RANGES.INTRO.start, ANIMATION_RANGES.INTRO.end)
    );
    torus.position.z = lerp(
      10,
      -20,
      scalePercent(ANIMATION_RANGES.INTRO.start, ANIMATION_RANGES.INTRO.end)
    );
  },
});

animationScripts.push({
  start: ANIMATION_RANGES.ROTATION.start,
  end: ANIMATION_RANGES.ROTATION.end,
  function() {
    setCameraToDefault();
    box.rotation.z = lerp(
      1,
      Math.PI,
      scalePercent(
        ANIMATION_RANGES.ROTATION.start,
        ANIMATION_RANGES.ROTATION.end
      )
    );
  },
});

animationScripts.push({
  start: ANIMATION_RANGES.CAMERA_MOVE.start,
  end: ANIMATION_RANGES.CAMERA_MOVE.end,
  function() {
    camera.lookAt(box.position);
    camera.position.x = lerp(
      0,
      -15,
      scalePercent(
        ANIMATION_RANGES.CAMERA_MOVE.start,
        ANIMATION_RANGES.CAMERA_MOVE.end
      )
    );
    camera.position.y = lerp(
      1,
      -15,
      scalePercent(
        ANIMATION_RANGES.CAMERA_MOVE.start,
        ANIMATION_RANGES.CAMERA_MOVE.end
      )
    );
    camera.position.z = lerp(
      10,
      25,
      scalePercent(
        ANIMATION_RANGES.CAMERA_MOVE.start,
        ANIMATION_RANGES.CAMERA_MOVE.end
      )
    );
  },
});

animationScripts.push({
  start: ANIMATION_RANGES.FINAL_SPIN.start,
  end: ANIMATION_RANGES.FINAL_SPIN.end,
  function() {
    const progress = scalePercent(
      ANIMATION_RANGES.FINAL_SPIN.start,
      ANIMATION_RANGES.FINAL_SPIN.end
    );
    box.rotation.x = lerp(BOX_INITIAL_ROTATION.x, Math.PI * 4, progress);
    box.rotation.y = lerp(BOX_INITIAL_ROTATION.y, Math.PI * 4, progress);
  },
});

/**
 * スクロール位置に応じたアニメーションを実行する
 * 現在のスクロール率に該当するアニメーションを1つだけ実行
 * スクロールが最下部（100%）に到達した場合は自動回転を継続
 */
function playScrollAnimation() {
  for (const animation of animationScripts) {
    const isInRange =
      scrollPercent >= animation.start && scrollPercent <= animation.end;
    if (isInRange) {
      animation.function();
      break;
    }
  }

  // 最下部到達後は自動回転を継続
  if (scrollPercent >= 100) {
    box.rotation.x += 0.01;
    box.rotation.y += 0.01;
  }
}

// ========================================
// イベントリスナー
// ========================================

/**
 * スクロールイベントハンドラー
 * ページ全体のスクロール進捗率（0-100）を計算して更新する
 */
const handleScroll = () => {
  scrollPercent =
    (document.documentElement.scrollTop /
      (document.documentElement.scrollHeight -
        document.documentElement.clientHeight)) *
    100;
};
window.addEventListener("scroll", handleScroll);

/**
 * リサイズイベントハンドラー
 * ウィンドウサイズの変更に応じてカメラとレンダラーを更新する
 */
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

/**
 * アニメーションループの1フレーム
 * スクロールアニメーションを実行し、シーンをレンダリングする
 * requestAnimationFrameで再帰的に呼び出される
 */
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
