// app.js
// WebGL2 demo: two orbiting point lights + Toon (Cel) shader
// Press 'l' or 'L' to toggle lights orbiting

'use strict';

// --- Minimal matrix helpers (only what we need) ---
function degToRad(d){ return d*Math.PI/180; }

const mat4 = {
  create: () => new Float32Array([1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1]),
  multiply: function(out,a,b){
    const o = out, A=a, B=b;
    for(let i=0;i<4;i++){
      for(let j=0;j<4;j++){
        let sum=0;
        for(let k=0;k<4;k++) sum += A[k*4 + j]*B[i*4 + k];
        o[i*4 + j]=sum;
      }
    }
    return out;
  },
  perspective: function(out,fovy,aspect,near,far){
    const f = 1.0/Math.tan(fovy/2);
    const nf = 1/(near - far);
    out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
    out[4]=0; out[5]=f; out[6]=0; out[7]=0;
    out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1;
    out[12]=0; out[13]=0; out[14]=(2*far*near)*nf; out[15]=0;
    return out;
  },
  lookAt: function(out, eye, center, up){
    const ex=eye[0], ey=eye[1], ez=eye[2];
    const cx=center[0], cy=center[1], cz=center[2];
    let zx = ex-cx, zy = ey-cy, zz = ez-cz;
    let len = Math.hypot(zx,zy,zz);
    zx/=len; zy/=len; zz/=len;
    let xx = up[1]*zz - up[2]*zy;
    let xy = up[2]*zx - up[0]*zz;
    let xz = up[0]*zy - up[1]*zx;
    len = Math.hypot(xx,xy,xz);
    if(len===0){ xx=1; xy=0; xz=0; } else { xx/=len; xy/=len; xz/=len; }
    let yx = zy*xz - zz*xy;
    let yy = zz*xx - zx*xz;
    let yz = zx*xy - zy*xx;
    out[0]=xx; out[1]=yx; out[2]=zx; out[3]=0;
    out[4]=xy; out[5]=yy; out[6]=zy; out[7]=0;
    out[8]=xz; out[9]=yz; out[10]=zz; out[11]=0;
    out[12]= -(xx*ex + xy*ey + xz*ez);
    out[13]= -(yx*ex + yy*ey + yz*ez);
    out[14]= -(zx*ex + zy*ey + zz*ez);
    out[15]=1;
    return out;
  },
  invertTranspose3x3: function(out3, m4){
    // compute inverse transpose of upper-left 3x3 matrix m4 (returns 3x3)
    // build 3x3
    const a00=m4[0], a01=m4[4], a02=m4[8];
    const a10=m4[1], a11=m4[5], a12=m4[9];
    const a20=m4[2], a21=m4[6], a22=m4[10];
    const b01 =  a22*a11 - a12*a21;
    const b11 = -a22*a10 + a12*a20;
    const b21 =  a21*a10 - a11*a20;
    let det = a00*b01 + a01*b11 + a02*b21;
    if(!det) return null;
    det = 1.0/det;
    out3[0] = b01*det;
    out3[1] = (-a22*a01 + a02*a21)*det;
    out3[2] = ( a12*a01 - a02*a11)*det;
    out3[3] = b11*det;
    out3[4] = ( a22*a00 - a02*a20)*det;
    out3[5] = (-a12*a00 + a02*a10)*det;
    out3[6] = b21*det;
    out3[7] = (-a21*a00 + a01*a20)*det;
    out3[8] = ( a11*a00 - a01*a10)*det;
    return out3;
  }
};

// --- WebGL boilerplate ---
const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl2', {antialias:true});
if(!gl){ alert('WebGL2 not supported'); throw 'no webgl2'; }

function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);
  if(canvas.width!==width || canvas.height!==height){
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0,0,canvas.width,canvas.height);
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Shaders (vertex + toon fragment) ---
const vsSource = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

out vec3 vNormal;
out vec3 vPosition;

void main(){
  vec4 worldPos = uModel * vec4(aPosition,1.0);
  vPosition = worldPos.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * worldPos;
}
`;

const fsSource = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vPosition;
out vec4 outColor;

struct PointLight {
  vec3 position;
  vec3 color;
  float intensity;
};

uniform PointLight uLights[2];
uniform int uNumLights;
uniform vec3 uViewPos;
uniform vec3 uBaseColor;
uniform float uAmbient;
uniform int uDiffuseSteps; // e.g. 3
uniform int uSpecularSteps; // e.g. 3
uniform float uShininess;

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uViewPos - vPosition);

  // ambient
  vec3 color = uAmbient * uBaseColor;

  for(int i=0;i<2;i++){
    if(i >= uNumLights) break;
    vec3 L = normalize(uLights[i].position - vPosition);
    vec3 H = normalize(L + V);

    // standard phong terms
    float diff = max(dot(N, L), 0.0);
    float spec = 0.0;
    if(diff > 0.0){
      spec = pow(max(dot(N, H), 0.0), uShininess);
    }

    // Toon quantization (cell shading)
    // Quantize diffuse into a few bands
    float dstep = float(uDiffuseSteps);
    float diffQ = floor(diff * dstep + 0.0001) / dstep;
    // Quantize specular
    float sstep = float(uSpecularSteps);
    float specQ = floor(spec * sstep + 0.0001) / sstep;

    vec3 lightContrib = (diffQ * uBaseColor + specQ * vec3(1.0)) * uLights[i].color * uLights[i].intensity;

    color += lightContrib;
  }

  // simple gamma
  color = pow(color, vec3(1.0/2.2));
  outColor = vec4(color, 1.0);
}
`;

// compile helpers
function compileShader(src, type){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(s));
    throw 'Shader compile error';
  }
  return s;
}
function createProgram(vs, fs){
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(vs, gl.VERTEX_SHADER));
  gl.attachShader(p, compileShader(fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(p));
    throw 'Program link error';
  }
  return p;
}

const program = createProgram(vsSource, fsSource);
gl.useProgram(program);

// --- Geometry creation: cube + sphere ---
function createCube(){
  // positions and normals
  const positions = [
    // +X
    1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1,
    // -X
    -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1,
    // +Y
    -1, 1, -1, 1, 1, -1, 1, 1, 1, -1, 1, 1,
    // -Y
    -1, -1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1,
    // +Z
    -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,
    // -Z
    1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1
  ];
  const normals = [
    // +X
    1,0,0,1,0,0,1,0,0,1,0,0,
    // -X
    -1,0,0,-1,0,0,-1,0,0,-1,0,0,
    // +Y
    0,1,0,0,1,0,0,1,0,0,1,0,
    // -Y
    0,-1,0,0,-1,0,0,-1,0,0,-1,0,
    // +Z
    0,0,-1,0,0,-1,0,0,-1,0,0,-1,
    // -Z
    0,0,1,0,0,1,0,0,1,0,0,1
  ];
  const indices = [];
  for(let i=0;i<6;i++){
    let off = i*4;
    indices.push(off+0,off+1,off+2, off+0,off+2,off+3);
  }
  return {positions:new Float32Array(positions), normals:new Float32Array(normals), indices:new Uint16Array(indices)};
}

function createSphere(ry, rz, rx, latBands = 24, longBands = 24){
  const positions = [];
  const normals = [];
  const indices = [];
  for(let lat=0; lat<=latBands; lat++){
    const theta = lat * Math.PI / latBands;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for(let lon=0; lon<=longBands; lon++){
      const phi = lon * 2 * Math.PI / longBands;
      const sinP = Math.sin(phi), cosP = Math.cos(phi);
      const x = Math.cos(phi)*sinT;
      const y = cosT;
      const z = Math.sin(phi)*sinT;
      positions.push(rx*x, ry*y, rz*z);
      normals.push(x,y,z);
    }
  }
  for(let lat=0; lat<latBands; lat++){
    for(let lon=0; lon<longBands; lon++){
      const first = (lat*(longBands+1)) + lon;
      const second = first + longBands + 1;
      indices.push(first, second, first+1);
      indices.push(second, second+1, first+1);
    }
  }
  return {positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices)};
}

// create VAO helper
function createVAO(mesh){
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const posLoc = gl.getAttribLocation(program, 'aPosition');
  const nLoc = gl.getAttribLocation(program, 'aNormal');

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

  const nBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(nLoc);
  gl.vertexAttribPointer(nLoc, 3, gl.FLOAT, false, 0, 0);

  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  return {vao, ibCount: mesh.indices.length};
}

// create objects
const cubeMesh = createCube();
const sphereMesh = createSphere(1.0,1.0,1.0, 36, 36);

const cube = createVAO(cubeMesh);
const sphere = createVAO(sphereMesh);

// --- Uniform locations ---
const loc = {
  uModel: gl.getUniformLocation(program, 'uModel'),
  uView: gl.getUniformLocation(program, 'uView'),
  uProjection: gl.getUniformLocation(program, 'uProjection'),
  uNormalMatrix: gl.getUniformLocation(program, 'uNormalMatrix'),
  uLights: [
    {pos: gl.getUniformLocation(program, 'uLights[0].position'),
     color: gl.getUniformLocation(program, 'uLights[0].color'),
     intensity: gl.getUniformLocation(program, 'uLights[0].intensity')},
    {pos: gl.getUniformLocation(program, 'uLights[1].position'),
     color: gl.getUniformLocation(program, 'uLights[1].color'),
     intensity: gl.getUniformLocation(program, 'uLights[1].intensity')}
  ],
  uNumLights: gl.getUniformLocation(program, 'uNumLights'),
  uViewPos: gl.getUniformLocation(program, 'uViewPos'),
  uBaseColor: gl.getUniformLocation(program, 'uBaseColor'),
  uAmbient: gl.getUniformLocation(program, 'uAmbient'),
  uDiffuseSteps: gl.getUniformLocation(program, 'uDiffuseSteps'),
  uSpecularSteps: gl.getUniformLocation(program, 'uSpecularSteps'),
  uShininess: gl.getUniformLocation(program, 'uShininess')
};

// --- Camera (spherical) ---
let camRadius = 3.5;
let camTheta = degToRad(60);
let camPhi = degToRad(60);
function cameraPosition(){
  const x = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
  const y = camRadius * Math.cos(camPhi);
  const z = camRadius * Math.sin(camPhi) * Math.sin(camTheta);
  return [x,y,z];
}

// mouse interaction
let dragging=false, lastX=0, lastY=0;
canvas.addEventListener('pointerdown', (e)=>{ dragging=true; lastX=e.clientX; lastY=e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', (e)=>{ dragging=false; });
canvas.addEventListener('pointercancel', ()=>{ dragging=false; });
canvas.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  camTheta -= dx * 0.005;
  camPhi = Math.min(Math.max(camPhi - dy*0.005, 0.1), Math.PI-0.1);
});
canvas.addEventListener('wheel', (e)=>{
  e.preventDefault();
  camRadius *= (1 + e.deltaY * 0.001);
  camRadius = Math.max(2.0, Math.min(30.0, camRadius));
}, {passive:false});

// --- Light animation state ---
let lightsOrbit = false;
let orbitStart = performance.now();
window.addEventListener('keydown', (e)=>{
  if(e.key === 'l' || e.key === 'L'){
    lightsOrbit = !lightsOrbit;
    if(lightsOrbit) orbitStart = performance.now();
  }
});

// initial light info
const lightColors = [
  [1.0, 0.7, 0.2], // warm amber
  [0.2, 0.5, 1.0]  // cool blue
];
const lightIntensities = [1.2, 0.9];
const orbitRadius = 4.0;
const orbitSpeed = 0.9; // radians per second

// --- Render state & draw ---
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.12,0.12,0.12,1.0);

const proj = mat4.create();
const view = mat4.create();
const model = mat4.create();
const normalMat = new Float32Array(9);

function setMat4Uniform(locU, mat){
  gl.uniformMatrix4fv(locU, false, mat);
}

function setLights(timeSec){
  // compute light positions (two lights in phase-shift)
  let positions = [];
  if(lightsOrbit){
    const t = timeSec * orbitSpeed;
    const a1 = t;
    const a2 = t + Math.PI * 0.6;
    positions.push([Math.cos(a1)*orbitRadius, Math.sin(a1*0.5)*0.7 + 0.8, Math.sin(a1)*orbitRadius]);
    positions.push([Math.cos(a2)*orbitRadius, Math.sin(a2*0.5)*0.7 + 0.8, Math.sin(a2)*orbitRadius]);
  }else{
    // static fallback positions if not orbiting
    positions.push([orbitRadius*0.7, 1.5, orbitRadius*0.3]);
    positions.push([-orbitRadius*0.7, 1.2, -orbitRadius*0.3]);
  }
  // upload
  for(let i=0;i<2;i++){
    gl.uniform3fv(loc.uLights[i].pos, positions[i]);
    gl.uniform3fv(loc.uLights[i].color, lightColors[i]);
    gl.uniform1f(loc.uLights[i].intensity, lightIntensities[i]);
  }
  gl.uniform1i(loc.uNumLights, 2);
}

function drawMesh(meshObj, modelMat, baseColor){
  // modelMat is Float32Array 16
  setMat4Uniform(loc.uModel, modelMat);

  // compute viewModel for normal matrix
  const viewModel = mat4.create();
  mat4.multiply(viewModel, view, modelMat); // view * model

  // compute normal matrix inverse transpose (3x3)
  mat4.invertTranspose3x3(normalMat, viewModel);
  gl.uniformMatrix3fv(loc.uNormalMatrix, false, normalMat);

  // base color and material
  gl.uniform3fv(loc.uBaseColor, baseColor);
  gl.uniform1f(loc.uAmbient, 0.12);
  gl.uniform1i(loc.uDiffuseSteps, 3);
  gl.uniform1i(loc.uSpecularSteps, 3);
  gl.uniform1f(loc.uShininess, 32.0);

  gl.bindVertexArray(meshObj.vao);
  gl.drawElements(gl.TRIANGLES, meshObj.ibCount, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
}

// Simple identity helper
function identityTo(out){
  for(let i=0;i<16;i++) out[i] = (i%5===0)?1:0;
}

// model transform helpers
function makeModel(out, translate, scale, rotateY){
  identityTo(out);
  // translate
  out[12] = translate[0];
  out[13] = translate[1];
  out[14] = translate[2];
  // scale (uniform)
  if(scale !== 1.0){
    out[0] = out[5] = out[10] = scale;
  }
  if(rotateY){
    const c = Math.cos(rotateY), s = Math.sin(rotateY);
    // apply rotation around Y to upper-left 3x3 *after* scaling
    out[0] = c*scale; out[2] = s*scale;
    out[8] = -s*scale; out[10] = c*scale;
  }
  return out;
}

let lastTime = performance.now();
function render(now){
  now = performance.now();
  const dt = (now - lastTime)*0.001;
  lastTime = now;
  const t = now * 0.001;

  resizeCanvas();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // projection
  mat4.perspective(proj, Math.PI/3, canvas.width/canvas.height, 0.1, 100.0);
  gl.uniformMatrix4fv(loc.uProjection, false, proj);

  // camera/view
  const camPos = cameraPosition();
  mat4.lookAt(view, camPos, [0,0,0], [0,1,0]);
  gl.uniformMatrix4fv(loc.uView, false, view);
  gl.uniform3fv(loc.uViewPos, camPos);

  // lights
  setLights(t);

  // draw ground plane (use large scaled cube)
  makeModel(model, [0,-1.9,0], 6.0, 0);
  drawMesh(cube, model, [0.18,0.18,0.18]);

  // draw a moving cube in center (rotating)
  makeModel(model, [0,0.0,0], 1.0, t*0.7);
  drawMesh(cube, model, [0.8,0.45,0.2]);

  // draw a sphere offset
  makeModel(model, [2.0, -0.2, -1.0], 0.9, 0);
  drawMesh(sphere, model, [0.15,0.6,0.9]);

  // draw second sphere
  makeModel(model, [-2.0, -0.2, 1.5], 0.95, 0);
  drawMesh(sphere, model, [0.9,0.2,0.6]);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
