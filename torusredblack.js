import * as $ from '//unpkg.com/three@0.117.1/build/three.module.js'
import { OrbitControls } from '//unpkg.com/three@0.117.1/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from '//unpkg.com/three@0.117.1/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from '//unpkg.com/three@0.117.1/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from '//unpkg.com/three@0.117.1/examples/jsm/postprocessing/UnrealBloomPass.js'

// ----
// Boot
// ----

const renderer = new $.WebGLRenderer({ antialias: false });
const scene = new $.Scene();
const camera = new $.PerspectiveCamera(75, 2, .1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
const composer = new EffectComposer(renderer);
window.addEventListener('resize', () => {
    const { clientWidth, clientHeight } = renderer.domElement;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(window.devicePixelRatio);
    composer.setSize(clientWidth, clientHeight);
});
document.body.prepend(renderer.domElement);
window.dispatchEvent(new Event('resize'));
renderer.setAnimationLoop(t => {
    composer.render();
    controls.update();
});

// ----
// Main
// ---- 

scene.background = new $.Color('black');
scene.fog = new $.Fog(scene.background, 1, 8);
camera.position.set(0, 0, 5);

const light0 = new $.DirectionalLight('red', 2);
scene.add(light0);

const light1 = new $.PointLight('gold', 5, 5, 1);
scene.add(light1);

//// Make Non Indexed Geometry

let geom;
{
    const geom_ = new $.TorusKnotBufferGeometry(4, .5, 100, 500, 4, 5);
    geom = geom_.toNonIndexed();
    geom_.dispose();
}

//// Compute Morph Attrib - Position

const positions0 = new Float32Array(geom.attributes.position.array.length);
const $vec0 = new $.Vector3();
const $vec1 = new $.Vector3();
const $vec2 = new $.Vector3();
const $norm = new $.Vector3();
const $tri0 = new $.Triangle();
const $mat0 = new $.Matrix4();
const $mat1 = new $.Matrix4();
const $euler = new $.Euler();
const $arr = geom.attributes.position.array;
for (let i = 0, I = $arr.length; i < I; i += 9) {
    $tri0.set(
        $vec0.set($arr[i + 0], $arr[i + 1], $arr[i + 2]),
        $vec1.set($arr[i + 3], $arr[i + 4], $arr[i + 5]),
        $vec2.set($arr[i + 6], $arr[i + 7], $arr[i + 8])
    ).getNormal($norm);
    $norm.multiplyScalar(2);
    $mat0.makeTranslation($norm.x, $norm.y, $norm.z);
    $mat1.makeRotationFromEuler($euler.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
    $mat0.multiplyMatrices($mat1, $mat0);
    $vec0.applyMatrix4($mat0);
    $vec1.applyMatrix4($mat0);
    $vec2.applyMatrix4($mat0);
    positions0.set($vec0.toArray(), i);
    positions0.set($vec1.toArray(), i + 3);
    positions0.set($vec2.toArray(), i + 6);
}

//// Compute Morph Attrib - Normal

const geom_ = new $.BufferGeometry();
geom_.setAttribute('position', new $.BufferAttribute(positions0, 3));
geom_.computeVertexNormals();
geom.morphAttributes.position = [geom_.attributes.position];
geom.morphAttributes.normal = [geom_.attributes.normal];
geom_.dispose();

//// Make Mesh{}

const mat = new $.MeshPhongMaterial({
    morphTargets: true, morphNormals: true, side: $.DoubleSide,
    transparent: true, opacity: 0.5, depthWrite: false
});
const mesh = new $.Mesh(geom, mat);
mesh.morphTargetInfluences = [2];
scene.add(mesh);

//// PostProcessing

const renderPass = new RenderPass(scene, camera);
const unrealBloomPass = new UnrealBloomPass(renderer.getDrawingBufferSize(), 1, 1, 0.2);
composer.addPass(renderPass);
composer.addPass(unrealBloomPass);

//// Animate

gsap.timeline({ repeat: 1e10 })
    .to(mesh.morphTargetInfluences, { duration: 2, '0': 0.1, ease: 'none' })
    .to(mesh.morphTargetInfluences, { delay: 1, duration: 3, '0': 2, ease: 'power2' })
    .play();
gsap.timeline({ repeat: 1e10 })
    .to(mesh.rotation, { duration: 20, y: Math.PI * 2, ease: 'none' })
    .play();
gsap.timeline({ repeat: 1e10 })
    .to(mesh.rotation, { duration: 60, x: Math.PI * 2, ease: 'none' })
    .play();
gsap.timeline({ repeat: 1e10 })
    .to(light1, { duration: 1, distance: 1, ease: 'none' })
    .play()
