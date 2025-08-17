import React, { useRef, useState, useEffect } from "react";

/**
 * Press-on nails try-on (with MediaPipe auto-fit) · Bilingual EN/中文
 * 默认语言：英文，可在右上角切换中文
 */

// Canonical finger keys (logic用英文，展示用字典翻译)
const FINGER_KEYS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const FINGER_POINTS = [
  { key: "Thumb", tip: 4, pip: 3 },
  { key: "Index", tip: 8, pip: 7 },
  { key: "Middle", tip: 12, pip: 11 },
  { key: "Ring", tip: 16, pip: 15 },
  { key: "Pinky", tip: 20, pip: 19 },
];

// 极简 i18n 字典
const I18N = {
  en: {
    title: "Press-on Nails Try-on · Auto-fit",
    subtitle:
      "Upload a hand photo and a transparent PNG of a nail tip. Click Auto-fit (MediaPipe), fine-tune by dragging/rotating/scaling, then Export PNG.",
    upload_hand: "Upload hand photo",
    upload_nail: "Upload nail PNG",
    reset_layout: "Reset layout",
    copy_params_all: "Copy current to all 5",
    export_png: "Export PNG",
    auto_fit: "Auto-fit (MediaPipe)",
    not_ready: "Model loading or not ready",
    loading_model: "Loading model…",
    finger_panel_title: "Current finger:",
    scale: "Scale",
    rotate: "Rotate",
    opacity: "Opacity",
    tip_copy: "Tip: tune one finger → Copy to all 5, then nudge positions.",
    auto_panel_title: "(Enabled) Auto-fit",
    auto_b1: "On first use it will download wasm & the model. If the button is disabled, wait 1–2s.",
    auto_b2: "Use photos with straight fingers and even lighting for best results.",
    auto_b3: "You can drag/rotate/scale after auto-fit.",
    stage_placeholder: "Please upload a hand photo",
    alert_need_upload: "Please upload a hand photo and a nail PNG first.",
    alert_no_hand: "No hand detected. Try a clearer photo with straighter fingers.",
    alert_autofit_failed: "Auto-fit failed. Check console logs or try again.",
    language: "Language",
    lang_en: "English",
    lang_zh: "中文",
    finger_Thumb: "Thumb",
    finger_Index: "Index",
    finger_Middle: "Middle",
    finger_Ring: "Ring",
    finger_Pinky: "Pinky",
    footer_tip:
      "Tip: use transparent PNG nails (or remove background first). For more realism, try soft-light/overlay blending after export in PS/Photopea.",
    dev_notes_title: "Developer notes / Key parameters",
    dev_p1: "TIP/PIP indices: Thumb 4/3, Index 8/7, Middle 12/11, Ring 16/15, Pinky 20/19.",
    dev_p2: "Angle: atan2(PIP.y - TIP.y, PIP.x - TIP.x).",
    dev_p3: "Scale: based on |PIP - TIP| vs base width 120 (coeff 1.35 is tunable).",
    dev_p4: "Coordinate mapping: consider object-contain scaling & paddings (left/top + containScale).",
    dev_p5: "Model/wasm: put hand_landmarker.task in /public; wasm via jsDelivr or self-host.",
  },
  zh: {
    title: "穿戴甲上手效果 · 自动贴合",
    subtitle:
      "上传手掌照与穿戴甲透明 PNG → 点“自动贴合（MediaPipe）”，可再拖拽/旋转/缩放微调 → 导出 PNG。",
    upload_hand: "上传手掌照",
    upload_nail: "上传穿戴甲 PNG",
    reset_layout: "重置排版",
    copy_params_all: "将当前参数复制到 5 指",
    export_png: "导出 PNG",
    auto_fit: "自动贴合（MediaPipe）",
    not_ready: "模型加载中或未就绪",
    loading_model: "加载模型中…",
    finger_panel_title: "当前手指：",
    scale: "缩放",
    rotate: "旋转",
    opacity: "透明度",
    tip_copy: "小技巧：先调好 1 个 → “复制到 5 指”，再微调位置。",
    auto_panel_title: "（已接入）自动贴合",
    auto_b1: "首次会下载 wasm 与模型，按钮灰时等 1–2 秒。",
    auto_b2: "建议使用手指较直、光线均匀的照片，效果更稳。",
    auto_b3: "自动贴合后仍可拖拽、旋转、缩放微调。",
    stage_placeholder: "请先上传手掌照",
    alert_need_upload: "请先上传手掌照和穿戴甲 PNG。",
    alert_no_hand: "没有检测到手部，请换更清晰、手指更伸直的照片。",
    alert_autofit_failed: "自动贴合失败，请查看控制台日志或稍后再试。",
    language: "语言",
    lang_en: "English",
    lang_zh: "中文",
    finger_Thumb: "拇指",
    finger_Index: "食指",
    finger_Middle: "中指",
    finger_Ring: "无名指",
    finger_Pinky: "小指",
    footer_tip:
      "建议：穿戴甲最好是 PNG 透明底（或先去底），想更真实可在导出后用 PS/Photopea 的“柔光/叠加”。",
    dev_notes_title: "开发者笔记 / 关键参数",
    dev_p1: "TIP/PIP 索引：拇指 4/3，食指 8/7，中指 12/11，无名指 16/15，小指 20/19。",
    dev_p2: "角度：atan2(PIP.y - TIP.y, PIP.x - TIP.x)。",
    dev_p3: "缩放：依据 |PIP-TIP| 与基准宽度 120（系数 1.35 可调）。",
    dev_p4: "坐标：考虑 object-contain 的缩放与留白（left/top + containScale）。",
    dev_p5: "模型/wasm：模型放 public/hand_landmarker.task；wasm 用 jsDelivr 或自托管。",
  },
};

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function TryOnNails() {
  const stageRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);

  const [lang, setLang] = useState("en");
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const fingerLabel = (key) => t(`finger_${key}`);

  const [handUrl, setHandUrl] = useState("");
  const [handMeta, setHandMeta] = useState({ w: 0, h: 0 });
  const [nailUrl, setNailUrl] = useState("");
  const [active, setActive] = useState(1);
  const [stageSize, setStageSize] = useState({ w: 900, h: 620 });
  const [mpReady, setMpReady] = useState(false);
  const [mpLoading, setMpLoading] = useState(false);

  const [layers, setLayers] = useState(() =>
    FINGER_KEYS.map((key, i) => ({
      key,
      x: 150 + i * 140,
      y: 260,
      scale: 1,
      rotation: 0,
      opacity: 0.95,
    }))
  );
  const dragState = useRef({ dragging: false, idx: -1, dx: 0, dy: 0 });

  useEffect(() => {
    const saved = localStorage.getItem("tryon_lang");
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("tryon_lang", lang);
  }, [lang]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onResize = () => {
      const rect = el.getBoundingClientRect();
      setStageSize({ w: rect.width, h: Math.max(480, rect.width * 0.6) });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 初始化 MediaPipe Hand Landmarker（浏览器端，本地推理）
  useEffect(() => {
    (async () => {
      try {
        setMpLoading(true);
        const vision = await import("@mediapipe/tasks-vision");
        const { HandLandmarker, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath: "/hand_landmarker.task",
            },
            numHands: 1,
            runningMode: "IMAGE",
          }
        );
        handLandmarkerRef.current = handLandmarker;
        setMpReady(true);
      } catch (e) {
        console.error("HandLandmarker init failed:", e);
      } finally {
        setMpLoading(false);
      }
    })();
  }, []);

  const onUploadHand = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataURL(f);
    setHandUrl(url);
    const img = await loadImage(url);
    setHandMeta({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
  };

  const onUploadNail = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataURL(f);
    setNailUrl(url);
  };

  const onPointerDown = (idx, e) => {
    e.preventDefault();
    dragState.current = {
      dragging: true,
      idx,
      dx: e.clientX - layers[idx].x,
      dy: e.clientY - layers[idx].y,
    };
    (e.target).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const { idx, dx, dy } = dragState.current;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - dx - rect.left;
    const y = e.clientY - dy - rect.top;
    setLayers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], x, y };
      return next;
    });
  };
  const onPointerUp = (e) => {
    dragState.current.dragging = false;
    dragState.current.idx = -1;
    (e.target).releasePointerCapture?.(e.pointerId);
  };

  const changeActiveField = (field, value) => {
    setLayers((prev) => {
      const next = [...prev];
      next[active] = { ...next[active], [field]: value };
      return next;
    });
  };

  const resetLayout = () => {
    setLayers(
      FINGER_KEYS.map((key, i) => ({
        key,
        x: 150 + i * 140,
        y: 260,
        scale: 1,
        rotation: 0,
        opacity: 0.95,
      }))
    );
  };

  const duplicateForAll = () => {
    setLayers((prev) => prev.map((l) => ({ ...l, ...prev[active] })));
  };

  function getContainPlacement(iw, ih, sw, sh) {
    const scale = Math.min(sw / iw, sh / ih);
    const w = iw * scale;
    const h = ih * scale;
    const left = (sw - w) / 2;
    const top = (sh - h) / 2;
    return { scale, left, top, w, h };
  }

  const autoFit = async () => {
    if (!handUrl || !nailUrl) {
      alert(t("alert_need_upload"));
      return;
    }
    if (!mpReady || !handLandmarkerRef.current) {
      alert(t("not_ready"));
      return;
    }

    try {
      const img = await loadImage(handUrl);
      const iw = handMeta.w || img.naturalWidth || img.width;
      const ih = handMeta.h || img.naturalHeight || img.height;

      const res = handLandmarkerRef.current.detect(img);
      const hands = res?.landmarks || res?.handLandmarks || [];
      if (!hands.length) {
        alert(t("alert_no_hand"));
        return;
      }

      const lm = hands[0];
      const nailImg = await loadImage(nailUrl);
      const NAIL_BASE_W = 120;

      const { left, top, scale: containScale } = getContainPlacement(iw, ih, stageSize.w, stageSize.h);

      function denorm(pt) {
        const isNormalized = pt.x <= 1 && pt.y <= 1;
        const xPix = isNormalized ? pt.x * iw : pt.x;
        const yPix = isNormalized ? pt.y * ih : pt.y;
        return {
          x: left + xPix * containScale,
          y: top + yPix * containScale,
        };
      }

      function dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
      }

      const newLayers = FINGER_POINTS.map((fp, i) => {
        const tip = denorm(lm[fp.tip]);
        const pip = denorm(lm[fp.pip]);
        const d = dist(tip, pip);
        const angle = (Math.atan2(pip.y - tip.y, pip.x - tip.x) * 180) / Math.PI;

        const ox = tip.x + (tip.x - pip.x) * 0.18;
        const oy = tip.y + (tip.y - pip.y) * 0.18;

        const scale = Math.max(0.3, Math.min(3, (d * 1.35) / NAIL_BASE_W));

        return {
          key: fp.key,
          x: ox,
          y: oy,
          rotation: angle,
          scale,
          opacity: 0.95,
        };
      });

      setLayers(newLayers);
      setActive(1);
    } catch (e) {
      console.error(e);
      alert(t("alert_autofit_failed"));
    }
  };

  const exportPNG = async () => {
    if (!handUrl || !nailUrl) return;
    const canvas = exportCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const bg = await loadImage(handUrl);
    canvas.width = stageSize.w;
    canvas.height = stageSize.h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const iw = handMeta.w || bg.naturalWidth || bg.width;
    const ih = handMeta.h || bg.naturalHeight || bg.height;
    const { left, top, w, h } = getContainPlacement(iw, ih, canvas.width, canvas.height);
    ctx.drawImage(bg, left, top, w, h);

    const nailImg = await loadImage(nailUrl);
    for (const l of layers) {
      const wN = nailImg.width * l.scale;
      const hN = nailImg.height * l.scale;
      ctx.save();
      ctx.globalAlpha = l.opacity;
      ctx.translate(l.x, l.y);
      ctx.rotate((l.rotation * Math.PI) / 180);
      ctx.drawImage(nailImg, -wN / 2, -hN / 2, wN, hN);
      ctx.restore();
    }

    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "try-on.png";
    a.click();
  };

  return (
    <div className="w-full mx-auto p-4 font-sans">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">{t("title")}</h1>
          <p className="text-gray-600 mb-4 max-w-3xl">{t("subtitle")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-500">{t("language")}:</label>
          <select
            className="px-2 py-1 rounded-md border bg-white"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t("language")}
            title={t("language")}
          >
            <option value="en">{t("lang_en")}</option>
            <option value="zh">{t("lang_zh")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-3">
        <label className="px-3 py-2 rounded-xl bg-gray-100 cursor-pointer hover:bg-gray-200">{t("upload_hand")}
          <input type="file" accept="image/*" className="hidden" onChange={onUploadHand} />
        </label>
        <label className="px-3 py-2 rounded-xl bg-gray-100 cursor-pointer hover:bg-gray-200">{t("upload_nail")}
          <input type="file" accept="image/*" className="hidden" onChange={onUploadNail} />
        </label>
        <button className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200" onClick={resetLayout}>{t("reset_layout")}</button>
        <button className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200" onClick={duplicateForAll}>{t("copy_params_all")}</button>
        <button className="px-3 py-2 rounded-xl bg-black text-white" onClick={exportPNG}>{t("export_png")}</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        {FINGER_KEYS.map((key, i) => (
          <button
            key={key}
            onClick={() => setActive(i)}
            className={"px-3 py-2 rounded-xl border " + (active === i ? "bg-black text-white" : "bg-white")}
          >{i + 1}. {fingerLabel(key)}</button>
        ))}
        <div className="grow" />
        <button
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50"
          disabled={mpLoading || !mpReady}
          onClick={autoFit}
          title={!mpReady ? t("not_ready") : t("auto_fit")}
        >{mpLoading ? t("loading_model") : t("auto_fit")}</button>
      </div>

      {/* 控制条 */}
      <div className="grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-2xl border">
          <h3 className="font-semibold mb-2">{t("finger_panel_title")} {fingerLabel(FINGER_KEYS[active])}</h3>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-24 text-sm text-gray-500">{t("scale")}</span>
            <input type="range" min={0.2} max={3} step={0.01}
              value={layers[active].scale}
              onChange={(e) => changeActiveField("scale", parseFloat(e.target.value))}
              className="w-full" />
            <span className="text-sm w-14">{layers[active].scale.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-24 text-sm text-gray-500">{t("rotate")}</span>
            <input type="range" min={-180} max={180} step={1}
              value={layers[active].rotation}
              onChange={(e) => changeActiveField("rotation", parseInt(e.target.value))}
              className="w-full" />
            <span className="text-sm w-14">{layers[active].rotation}°</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-sm text-gray-500">{t("opacity")}</span>
            <input type="range" min={0.2} max={1} step={0.01}
              value={layers[active].opacity}
              onChange={(e) => changeActiveField("opacity", parseFloat(e.target.value))}
              className="w-full" />
            <span className="text-sm w-14">{Math.round(layers[active].opacity * 100)}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t("tip_copy")}</p>
        </div>

        <div className="p-3 rounded-2xl border">
          <h3 className="font-semibold mb-2">{t("auto_panel_title")}</h3>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>{t("auto_b1")}</li>
            <li>{t("auto_b2")}</li>
            <li>{t("auto_b3")}</li>
          </ul>
        </div>
      </div>

      {/* 画布舞台 */}
      <div
        ref={stageRef}
        className="relative w-full rounded-2xl border overflow-hidden"
        style={{ height: stageSize.h }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* 手掌底图 */}
        {handUrl ? (
          <img src={handUrl} alt="hand" className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            {t("stage_placeholder")}
          </div>
        )}

        {/* 甲片图层 */}
        {nailUrl && layers.map((l, idx) => (
          <Layer
            key={idx}
            idx={idx}
            active={active === idx}
            data={l}
            nailUrl={nailUrl}
            onPointerDown={onPointerDown}
          />
        ))}
      </div>

      {/* 隐藏导出画布 */}
      <canvas ref={exportCanvasRef} className="hidden" />

      <FooterTips t={t} />
    </div>
  );
}

function Layer({ idx, active, data, nailUrl, onPointerDown }) {
  const { x, y, scale, rotation, opacity } = data;
  return (
    <div
      className={"absolute cursor-grab " + (active ? "ring-2 ring-black/50" : "")}
      style={{ left: x, top: y, transform: `translate(-50%, -50%) rotate(${rotation}deg)`, opacity }}
      onPointerDown={(e) => onPointerDown(idx, e)}
    >
      <img
        src={nailUrl}
        alt={`nail-${idx}`}
        className="select-none"
        style={{ width: 120 * scale, height: "auto", pointerEvents: "none", filter: "brightness(1.02) contrast(0.98)" }}
      />
    </div>
  );
}

function FooterTips({ t }) {
  return (
    <div className="mt-6 text-xs text-gray-500 leading-6">
      <p>{t("footer_tip")}</p>
      <details className="mt-2">
        <summary className="cursor-pointer">{t("dev_notes_title")}</summary>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>{t("dev_p1")}</li>
          <li>{t("dev_p2")}</li>
          <li>{t("dev_p3")}</li>
          <li>{t("dev_p4")}</li>
          <li>{t("dev_p5")}</li>
        </ul>
      </details>
    </div>
  );
}
