export const FLUTE_MODELS = {
  double: {
    name: "老料双节白铜演奏笛",
    photo: "/flute-double-cutout.png",
    bounds: [0, 310, 2170, 108],
    holes: [702, 974, 1232, 1309, 1423, 1527, 1602, 1714],
  },
  single: {
    name: "老料单节特制竹笛",
    photo: "/flute-single-cutout.png",
    bounds: [20, 320, 2130, 106],
    holes: [712, 986, 1244, 1321, 1418, 1537, 1605, 1731],
  },
};

export function normalizeAngle(angle) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

export function clampZoom(zoom) {
  return Math.max(0.65, Math.min(2.25, zoom));
}

export function rotationMatrix(state) {
  const radians = Math.PI / 180;
  const cosineX = Math.cos(state.rotX * radians);
  const sineX = Math.sin(state.rotX * radians);
  const cosineY = Math.cos(state.rotY * radians);
  const sineY = Math.sin(state.rotY * radians);
  const cosineZ = Math.cos(state.rotZ * radians);
  const sineZ = Math.sin(state.rotZ * radians);
  return new Float32Array([
    cosineZ * cosineY, sineZ * cosineY, -sineY,
    cosineZ * sineY * sineX - sineZ * cosineX,
    sineZ * sineY * sineX + cosineZ * cosineX, cosineY * sineX,
    cosineZ * sineY * cosineX + sineZ * sineX,
    sineZ * sineY * cosineX - cosineZ * sineX, cosineY * cosineX,
  ]);
}

export function cylinderVertices(segments = 96) {
  const vertices = [];
  const pushVertex = (position, normal, material) => vertices.push(...position, ...normal, material);
  const radius = 0.1;
  for (let segment = 0; segment < segments; segment++) {
    const firstAngle = segment / segments * Math.PI * 2;
    const nextAngle = (segment + 1) / segments * Math.PI * 2;
    const firstNormal = [0, Math.sin(firstAngle), Math.cos(firstAngle)];
    const nextNormal = [0, Math.sin(nextAngle), Math.cos(nextAngle)];
    const leftFirst = [-2.2, firstNormal[1] * radius, firstNormal[2] * radius];
    const rightFirst = [2.2, leftFirst[1], leftFirst[2]];
    const leftNext = [-2.2, nextNormal[1] * radius, nextNormal[2] * radius];
    const rightNext = [2.2, leftNext[1], leftNext[2]];
    for (const [position, normal] of [
      [leftFirst, firstNormal], [rightFirst, firstNormal], [rightNext, nextNormal],
      [leftFirst, firstNormal], [rightNext, nextNormal], [leftNext, nextNormal],
    ]) pushVertex(position, normal, 0);
    for (const end of [-1, 1]) {
      const normal = [end, 0, 0];
      const outerFirst = [end * 2.2, leftFirst[1], leftFirst[2]];
      const outerNext = [end * 2.2, leftNext[1], leftNext[2]];
      const innerFirst = [end * 2.2, leftFirst[1] * 0.68, leftFirst[2] * 0.68];
      const innerNext = [end * 2.2, leftNext[1] * 0.68, leftNext[2] * 0.68];
      for (const position of [outerFirst, outerNext, innerNext, outerFirst, innerNext, innerFirst]) {
        pushVertex(position, normal, 1);
      }
      for (const position of [[end * 2.18, 0, 0], innerFirst, innerNext]) {
        pushVertex(position, normal, end === 1 ? 2 : 1);
      }
    }
  }
  return new Float32Array(vertices);
}

const vertexSource = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute float aMaterial;
  uniform mat3 uRotation;
  uniform vec2 uFit;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying float vMaterial;
  void main() {
    vec3 rotated = uRotation * aPosition;
    gl_Position = vec4(rotated.xy * uFit, -rotated.z * 0.08, 1.0 - rotated.z / 8.0);
    vPosition = aPosition;
    vNormal = aNormal;
    vWorldNormal = uRotation * aNormal;
    vMaterial = aMaterial;
  }
`;

const fragmentSource = `
  precision mediump float;
  uniform sampler2D uPhoto;
  uniform vec4 uBounds;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying float vMaterial;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 worldNormal = normalize(vWorldNormal);
    float horizontal = (vPosition.x + 2.2) / 4.4;
    float vertical = normal.z >= 0.0 ? 0.5 - normal.y * 0.40 : 0.20;
    vec2 uv = uBounds.xy + vec2(horizontal, vertical) * uBounds.zw;
    vec4 sampleColor = texture2D(uPhoto, uv);
    vec3 color = mix(vec3(0.92, 0.91, 0.82), sampleColor.rgb, sampleColor.a);
    if (vMaterial > 0.5) color = vec3(0.92, 0.91, 0.82);
    if (vMaterial > 1.5) color = vec3(0.075, 0.042, 0.022);
    float light = 0.65 + 0.35 * max(dot(worldNormal, normalize(vec3(-0.2, 0.7, 1.0))), 0.0);
    float highlight = pow(max(dot(reflect(-normalize(vec3(-0.2, 0.7, 1.0)), worldNormal), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
    gl_FragColor = vec4(color * light + vec3(highlight * 0.10), 1.0);
  }
`;

export function createFluteViewer(canvas, getState, onUnavailable = () => {}) {
  const graphics = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!graphics) {
    onUnavailable();
    return null;
  }
  const shaders = [];
  const program = graphics.createProgram();
  let buffer;
  let texture;
  let disposed = false;
  let image;
  let currentModel;
  let textureReady = false;
  let resizeObserver;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (image) image.onload = image.onerror = null;
    resizeObserver?.disconnect();
    canvas.removeEventListener("webglcontextlost", loseContext);
    if (buffer) graphics.deleteBuffer(buffer);
    if (texture) graphics.deleteTexture(texture);
    for (const shader of shaders) graphics.deleteShader(shader);
    graphics.deleteProgram(program);
    graphics.getExtension("WEBGL_lose_context")?.loseContext();
  };
  const loseContext = (event) => {
    event.preventDefault();
    dispose();
    onUnavailable();
  };
  const compile = (type, source) => {
    const shader = graphics.createShader(type);
    shaders.push(shader);
    graphics.shaderSource(shader, source);
    graphics.compileShader(shader);
    if (!graphics.getShaderParameter(shader, graphics.COMPILE_STATUS)) {
      throw new Error(graphics.getShaderInfoLog(shader));
    }
    graphics.attachShader(program, shader);
  };
  try {
    compile(graphics.VERTEX_SHADER, vertexSource);
    compile(graphics.FRAGMENT_SHADER, fragmentSource);
    graphics.linkProgram(program);
    if (!graphics.getProgramParameter(program, graphics.LINK_STATUS)) {
      throw new Error(graphics.getProgramInfoLog(program));
    }
    graphics.useProgram(program);
    buffer = graphics.createBuffer();
    graphics.bindBuffer(graphics.ARRAY_BUFFER, buffer);
    const vertices = cylinderVertices();
    graphics.bufferData(graphics.ARRAY_BUFFER, vertices, graphics.STATIC_DRAW);
    for (const [name, size, offset] of [["aPosition", 3, 0], ["aNormal", 3, 12], ["aMaterial", 1, 24]]) {
      const attribute = graphics.getAttribLocation(program, name);
      graphics.enableVertexAttribArray(attribute);
      graphics.vertexAttribPointer(attribute, size, graphics.FLOAT, false, 28, offset);
    }
    texture = graphics.createTexture();
    graphics.activeTexture(graphics.TEXTURE0);
    graphics.bindTexture(graphics.TEXTURE_2D, texture);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_WRAP_S, graphics.CLAMP_TO_EDGE);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_WRAP_T, graphics.CLAMP_TO_EDGE);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_MIN_FILTER, graphics.LINEAR);
    graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_MAG_FILTER, graphics.LINEAR);
    graphics.enable(graphics.DEPTH_TEST);
    graphics.clearColor(0, 0, 0, 0);
    const rotation = graphics.getUniformLocation(program, "uRotation");
    const fit = graphics.getUniformLocation(program, "uFit");
    const bounds = graphics.getUniformLocation(program, "uBounds");
    const render = () => {
      if (disposed || !canvas.isConnected) return;
      const state = getState();
      if (!state.rotateMode || state.viewMode !== "full") return;
      if (currentModel !== state.model) {
        currentModel = state.model;
        textureReady = false;
        if (image) image.onload = image.onerror = null;
        image = new Image();
        const model = FLUTE_MODELS[state.model];
        image.onload = () => {
          if (disposed) return;
          graphics.bindTexture(graphics.TEXTURE_2D, texture);
          graphics.texImage2D(graphics.TEXTURE_2D, 0, graphics.RGBA, graphics.RGBA, graphics.UNSIGNED_BYTE, image);
          if (graphics.getError() !== graphics.NO_ERROR) {
            dispose();
            onUnavailable();
            return;
          }
          graphics.uniform4f(bounds, model.bounds[0] / image.width, model.bounds[1] / image.height,
            model.bounds[2] / image.width, model.bounds[3] / image.height);
          textureReady = true;
          canvas.closest(".flute-stage")?.classList.add("viewer-ready");
          render();
        };
        image.onerror = () => { dispose(); onUnavailable(); };
        image.src = model.photo;
      }
      if (!textureReady) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      graphics.viewport(0, 0, width, height);
      graphics.clear(graphics.COLOR_BUFFER_BIT | graphics.DEPTH_BUFFER_BIT);
      const matrix = rotationMatrix(state);
      const pixelsPerUnit = Math.min(width * 0.43 / (2.2 * Math.abs(matrix[0]) + 0.14),
        height * 0.36 / (2.2 * Math.abs(matrix[1]) + 0.14)) * state.zoom;
      graphics.uniformMatrix3fv(rotation, false, matrix);
      graphics.uniform2f(fit, pixelsPerUnit * 2 / width, pixelsPerUnit * 2 / height);
      graphics.drawArrays(graphics.TRIANGLES, 0, vertices.length / 7);
    };
    resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);
    canvas.addEventListener("webglcontextlost", loseContext);
    return { render, dispose };
  } catch {
    dispose();
    onUnavailable();
    return null;
  }
}
