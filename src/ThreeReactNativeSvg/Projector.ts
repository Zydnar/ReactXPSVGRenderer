import {
    Box3,
    Color,
    Vector2,
    Vector3,
    Vector4,
    Matrix3,
    Matrix4,
    FaceColors,
    VertexColors,
    Frustum,
    Mesh,
    Light,
    Points,
    Line,
    BufferGeometry,
    Geometry,
    DoubleSide,
    FrontSide,
    BackSide,
    Sprite,
    LineSegments, Camera, Material, Object3D, Scene,
} from 'three';
import {LightType} from "./SVGRenderer";

interface FrustumType extends Frustum {
    intersectsSprite(sprite: Sprite): boolean;
}

interface PointsType extends Points {
    isPoints: true;
}

interface MaterialType extends Material {
    visibility: boolean;
}

function isPoints(arg: any): arg is PointsType {
    return (arg as PointsType).isPoints;
}

/**
 * @author mrdoob / http://mrdoob.com/
 * @author supereggbert / http://www.paulbrunt.co.uk/
 * @author julianwa / https://github.com/julianwa
 */

export class RenderableObject {
    id = 0;

    object = null;
    z = 0;
    renderOrder = 0;
}

export class RenderableVertex {

    position = new Vector3();
    positionWorld = new Vector3();
    positionScreen = new Vector4();
    x: number = 0;
    y: number = 0;
    z: number = 0;
    visible = true;
    copy = (vertex) => {
        this.positionWorld.copy(vertex.positionWorld);
        this.positionScreen.copy(vertex.positionScreen);
    }
}

export class RenderableFace {
    id = 0;

    v1 = new RenderableVertex();
    v2 = new RenderableVertex();
    v3 = new RenderableVertex();

    normalModel = new Vector3();

    vertexNormalsModel = [new Vector3(), new Vector3(), new Vector3()];
    vertexNormalsLength = 0;

    color = new Color();
    material = null;
    uvs = [new Vector2(), new Vector2(), new Vector2()];

    z = 0;
    renderOrder = 0;
}

export class RenderableLine {
    id = 0;

    v1 = new RenderableVertex();
    v2 = new RenderableVertex();

    vertexColors = [new Color(), new Color()];
    material = null;

    z = 0;
    renderOrder = 0;
}

export class RenderableSprite {
    id = 0;

    object = null;

    x = 0;
    y = 0;
    z = 0;

    rotation = 0;
    scale = new Vector2();

    material = null;
    renderOrder = 0;
}
export type RenderDataObject = Sprite | Mesh | Line | Points;
export interface RenderData {
    objects: RenderDataObject[];
    lights: LightType[];
    elements: RenderableFace[];
}
export default class Projector {
    _object;
    _objectCount;
    _objectPool: RenderableObject[] = [];
    _objectPoolLength = 0;
    _vertex;
    _vertexCount;
    _vertexPool = [];
    _vertexPoolLength = 0;
    _face;
    _faceCount: number;
    _facePool: RenderableFace[] = [];
    _facePoolLength = 0;
    _line: RenderableLine;
    _lineCount;
    _linePool = [];
    _linePoolLength = 0;
    _sprite;
    _spriteCount;
    _spritePool = [];
    _spritePoolLength = 0;

    _renderData: RenderData = {
        objects: [],
        lights: [],
        elements: []
    };

    _vector3 = new Vector3();
    _vector4 = new Vector4();

    _clipBox = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    _boundingBox = new Box3();
    _points3 = new Array(3);

    _viewMatrix = new Matrix4();
    _viewProjectionMatrix = new Matrix4();

    _modelMatrix;
    _modelViewProjectionMatrix = new Matrix4();

    _normalMatrix = new Matrix3();

    _frustum: FrustumType = (new Frustum() as FrustumType);

    _clippedVertex1PositionScreen = new Vector4();
    _clippedVertex2PositionScreen = new Vector4();
    renderList: {
        projectVertex: (vertex: any) => void;
        pushNormal: (x: number, y: number, z: number) => void;
        pushVertex: (x: number, y: number, z: number) => void;
        checkTriangleVisibility: (v1: RenderableVertex, v2: RenderableVertex, v3: RenderableVertex) => (true | boolean);
        pushLine: (a: number, b: number) => void;
        pushColor: (r: number, g: number, b: number) => void;
        pushTriangle: (...args: [number, number, number, MaterialType]) => void;
        checkBackfaceCulling: (v1: RenderableVertex, v2: RenderableVertex, v3: RenderableVertex) => boolean;
        setObject: (value: any) => void;
        pushUv: (x: number, y: number) => void;
    };

    constructor() {
        this.renderList = this.RenderList();
    }

    projectVector = (vector: Vector3, camera: Camera) => {

        console.warn('THREE.Projector: .projectVector() is now vector.project().');
        vector.project(camera);

    };

    unprojectVector = (vector: Vector3, camera: Camera) => {

        console.warn('THREE.Projector: .unprojectVector() is now vector.unproject().');
        vector.unproject(camera);

    };

    pickingRay = () => {

        console.error('THREE.Projector: .pickingRay() is now raycaster.setFromCamera().');

    };
    RenderList = () => {

        const normals: number[] = [];
        const colors: number[] = [];
        const uvs: number[] = [];

        let object: RenderDataObject;
        let material: MaterialType;

        const normalMatrix = new Matrix3();

        const setObject = (value: RenderDataObject) => {

            object = value;
            material = object.material;

            normalMatrix.getNormalMatrix(object.matrixWorld);

            normals.length = 0;
            colors.length = 0;
            uvs.length = 0;

        };

        const projectVertex = (vertex) => {

            const position = vertex.position;
            const positionWorld = vertex.positionWorld;
            const positionScreen = vertex.positionScreen;

            positionWorld.copy(position).applyMatrix4(this._modelMatrix);
            positionScreen.copy(positionWorld).applyMatrix4(this._viewProjectionMatrix);

            const invW = 1 / positionScreen.w;

            positionScreen.x *= invW;
            positionScreen.y *= invW;
            positionScreen.z *= invW;

            vertex.visible = positionScreen.x >= -1 && positionScreen.x <= 1 &&
                positionScreen.y >= -1 && positionScreen.y <= 1 &&
                positionScreen.z >= -1 && positionScreen.z <= 1;

        };

        const pushVertex = (x: number, y: number, z: number) => {

            this._vertex = this.getNextVertexInPool();
            this._vertex.position.set(x, y, z);

            projectVertex(this._vertex);

        };

        const pushNormal = (x: number, y: number, z: number) => {

            normals.push(x, y, z);

        };

        const pushColor = (r: number, g: number, b: number) => {

            colors.push(r, g, b);

        };

        const pushUv = (x: number, y: number) => {

            uvs.push(x, y);

        };

        const checkTriangleVisibility = (v1: RenderableVertex, v2: RenderableVertex, v3: RenderableVertex) => {

            if (v1.visible === true || v2.visible === true || v3.visible === true) return true;

            this._points3[0] = v1.positionScreen;
            this._points3[1] = v2.positionScreen;
            this._points3[2] = v3.positionScreen;

            return this._clipBox.intersectsBox(this._boundingBox.setFromPoints(this._points3));

        };

        const checkBackfaceCulling = (v1: RenderableVertex, v2: RenderableVertex, v3: RenderableVertex) => {

            return ((v3.positionScreen.x - v1.positionScreen.x) *
                (v2.positionScreen.y - v1.positionScreen.y) -
                (v3.positionScreen.y - v1.positionScreen.y) *
                (v2.positionScreen.x - v1.positionScreen.x)) < 0;

        };

        const pushLine = (a: number, b: number) => {

            const v1: RenderableVertex = this._vertexPool[a];
            const v2: RenderableVertex = this._vertexPool[b];

            // Clip

            v1.positionScreen.copy(new Vector4(
                v1.position.x,
                v1.position.y,
                v1.position.z,
                1
            )).applyMatrix4(this._modelViewProjectionMatrix);
            v2.positionScreen.copy(new Vector4(
                v2.position.x,
                v2.position.y,
                v2.position.z,
                1
            )).applyMatrix4(this._modelViewProjectionMatrix);

            if (this.clipLine(v1.positionScreen, v2.positionScreen) === true) {

                // Perform the perspective divide
                v1.positionScreen.multiplyScalar(1 / v1.positionScreen.w);
                v2.positionScreen.multiplyScalar(1 / v2.positionScreen.w);

                this._line = this.getNextLineInPool();
                this._line.id = object.id;
                this._line.v1.copy(v1);
                this._line.v2.copy(v2);
                this._line.z = Math.max(v1.positionScreen.z, v2.positionScreen.z);
                this._line.renderOrder = object.renderOrder;

                this._line.material = object.material;

                if (object.material.vertexColors === VertexColors) {

                    this._line.vertexColors[0].fromArray(colors, a * 3);
                    this._line.vertexColors[1].fromArray(colors, b * 3);

                }

                this._renderData.elements.push(this._line);

            }

        };

        const pushTriangle = (...args: [number, number, number, MaterialType]) => {
            const [a, b, c, material] = args;
            const v1 = this._vertexPool[a];
            const v2 = this._vertexPool[b];
            const v3 = this._vertexPool[c];

            if (checkTriangleVisibility(v1, v2, v3) === false) return;

            if (material.side === DoubleSide || checkBackfaceCulling(v1, v2, v3) === true) {

                this._face = this.getNextFaceInPool();

                this._face.id = object.id;
                this._face.v1.copy(v1);
                this._face.v2.copy(v2);
                this._face.v3.copy(v3);
                this._face.z = (v1.positionScreen.z + v2.positionScreen.z + v3.positionScreen.z) / 3;
                this._face.renderOrder = object.renderOrder;

                // face normal
                this._vector3.subVectors(v3.position, v2.position);
                this._vector4.subVectors(v1.position, v2.position);
                this._vector3.cross(this._vector4);
                this._face.normalModel.copy(this._vector3);
                this._face.normalModel.applyMatrix3(normalMatrix).normalize();

                for (let i = 0; i < 3; i++) {

                    var normal = this._face.vertexNormalsModel[i];
                    normal.fromArray(normals, (args[i] as number) * 3);
                    normal.applyMatrix3(normalMatrix).normalize();

                    var uv = this._face.uvs[i];
                    uv.fromArray(uvs, (args[i] as number) * 2);

                }

                this._face.vertexNormalsLength = 3;

                this._face.material = material;

                if (material.vertexColors === FaceColors || material.vertexColors === VertexColors) {

                    this._face.color.fromArray(colors, a * 3);

                }

                this._renderData.elements.push(this._face);

            }

        };

        return {
            setObject: setObject,
            projectVertex: projectVertex,
            checkTriangleVisibility: checkTriangleVisibility,
            checkBackfaceCulling: checkBackfaceCulling,
            pushVertex: pushVertex,
            pushNormal: pushNormal,
            pushColor: pushColor,
            pushUv: pushUv,
            pushLine: pushLine,
            pushTriangle: pushTriangle
        };

    };

    projectObject(object: LightType | Mesh | Line | Points | Sprite) {

        if (object.visible === false) return;

        if (object instanceof Light) {

            this._renderData.lights.push(object);

        } else if (object instanceof Mesh || object instanceof Line || object instanceof Points) {

            if ((object.material as MaterialType).visible === false) return;
            if (object.frustumCulled === true && this._frustum.intersectsObject(object) === false) return;

            this.addObject(object);

        } else if (object instanceof Sprite) {

            if (object.material.visible === false) return;
            if (object.frustumCulled === true && this._frustum.intersectsSprite(object) === false) return;

            this.addObject(object);

        }
        if (!isPoints(object)) {
            let children: (Light | Mesh | Line | Sprite)[] = (object.children as (Light | Mesh | Line | Sprite)[]);

            for (let i = 0, l = children.length; i < l; i++) {

                this.projectObject(children[i]);

            }
        }
    }

    addObject(object: RenderDataObject) {

        this._object = this.getNextObjectInPool();
        this._object.id = object.id;
        this._object.object = object;

        this._vector3.setFromMatrixPosition(object.matrixWorld);
        this._vector3.applyMatrix4(this._viewProjectionMatrix);
        this._object.z = this._vector3.z;
        this._object.renderOrder = object.renderOrder;

        this._renderData.objects.push(this._object);

    }

    projectScene = (scene: Scene, camera: Camera, sortObjects: boolean, sortElements: boolean): RenderData => {

        this._faceCount = 0;
        this._lineCount = 0;
        this._spriteCount = 0;

        this._renderData.elements.length = 0;

        if (scene.autoUpdate === true) scene.updateMatrixWorld();
        if (camera.parent === null) camera.updateMatrixWorld(false);

        this._viewMatrix.copy(camera.matrixWorldInverse);
        this._viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, this._viewMatrix);

        this._frustum.setFromMatrix(this._viewProjectionMatrix);

        //

        this._objectCount = 0;

        this._renderData.objects.length = 0;
        this._renderData.lights.length = 0;

        this.projectObject(scene);

        if (sortObjects === true) {

            this._renderData.objects.sort(this.painterSort);

        }

        //

        const objects = this._renderData.objects;

        for (let o = 0, ol = objects.length; o < ol; o++) {

            const object: Object3D = objects[o].object;
            const geometry = object.geometry;

            this.renderList.setObject(object);

            this._modelMatrix = object.matrixWorld;

            this._vertexCount = 0;

            if (object instanceof Mesh) {

                if (geometry instanceof BufferGeometry) {

                    let material = object.material;

                    let isMultiMaterial = Array.isArray(material);

                    const attributes = geometry.attributes;
                    const groups = geometry.groups;

                    if (attributes.position === undefined) continue;

                    const positions = attributes.position.array;

                    for (let i = 0, l = positions.length; i < l; i += 3) {

                        let x = positions[i];
                        let y = positions[i + 1];
                        let z = positions[i + 2];

                        if (material.morphTargets === true) {

                            const morphTargets = geometry.morphAttributes.position;
                            const morphInfluences = object.morphTargetInfluences;

                            for (let t = 0, tl = morphTargets.length; t < tl; t++) {

                                let influence = morphInfluences[t];

                                if (influence === 0) continue;

                                const target = morphTargets[t];

                                x += (target.getX(i / 3) - positions[i]) * influence;
                                y += (target.getY(i / 3) - positions[i + 1]) * influence;
                                z += (target.getZ(i / 3) - positions[i + 2]) * influence;

                            }

                        }

                        this.renderList.pushVertex(x, y, z);

                    }

                    if (attributes.normal !== undefined) {

                        const normals = attributes.normal.array;

                        for (let i = 0, l = normals.length; i < l; i += 3) {

                            this.renderList.pushNormal(normals[i], normals[i + 1], normals[i + 2]);

                        }

                    }

                    if (attributes.color !== undefined) {

                        const colors = attributes.color.array;

                        for (let i = 0, l = colors.length; i < l; i += 3) {

                            this.renderList.pushColor(colors[i], colors[i + 1], colors[i + 2]);

                        }

                    }

                    if (attributes.uv !== undefined) {

                        const uvs = attributes.uv.array;

                        for (let i = 0, l = uvs.length; i < l; i += 2) {

                            this.renderList.pushUv(uvs[i], uvs[i + 1]);

                        }

                    }

                    if (geometry.index !== null) {

                        let indices = geometry.index.array;

                        if (groups.length > 0) {

                            for (let g = 0; g < groups.length; g++) {

                                const group = groups[g];

                                material = isMultiMaterial === true
                                    //todo lepsze rozwiązanie
                                    ? (object.material as MaterialType[])[(group.materialIndex as number)]
                                    : object.material;

                                if (material === undefined) continue;

                                for (let i = group.start, l = group.start + group.count; i < l; i += 3) {

                                    this.renderList.pushTriangle(
                                        indices[i],
                                        indices[i + 1],
                                        indices[i + 2],
                                        (material as MaterialType)
                                    );

                                }

                            }

                        } else {

                            for (let i = 0, l = indices.length; i < l; i += 3) {

                                this.renderList.pushTriangle(indices[i], indices[i + 1], indices[i + 2], (material as MaterialType));

                            }

                        }

                    } else {

                        if (groups.length > 0) {

                            for (let g = 0; g < groups.length; g++) {

                                const group = groups[g];

                                material = isMultiMaterial === true
                                    ? (object.material as MaterialType[])[(group.materialIndex as number)]
                                    : object.material;

                                if (material === undefined) continue;

                                for (let i = group.start, l = group.start + group.count; i < l; i += 3) {

                                    this.renderList.pushTriangle(i, i + 1, i + 2, (material as MaterialType));

                                }

                            }

                        } else {

                            for (let i = 0, l = positions.length / 3; i < l; i += 3) {

                                this.renderList.pushTriangle(i, i + 1, i + 2, (material as MaterialType));

                            }

                        }

                    }

                } else if (geometry instanceof Geometry) {

                    const vertices = geometry.vertices;
                    const faces = geometry.faces;
                    const faceVertexUvs = geometry.faceVertexUvs[0];

                    this._normalMatrix.getNormalMatrix(this._modelMatrix);

                    let material = object.material;

                    let isMultiMaterial = Array.isArray(material);

                    for (let v = 0, vl = vertices.length; v < vl; v++) {

                        const vertex = vertices[v];

                        this._vector3.copy(vertex);

                        if (material.morphTargets === true) {

                            const morphTargets = geometry.morphTargets;
                            const morphInfluences = object.morphTargetInfluences;

                            for (let t = 0, tl = morphTargets.length; t < tl; t++) {

                                let influence = morphInfluences[t];

                                if (influence === 0) continue;

                                const target = morphTargets[t];
                                const targetVertex = target.vertices[v];

                                this._vector3.x += (targetVertex.x - vertex.x) * influence;
                                this._vector3.y += (targetVertex.y - vertex.y) * influence;
                                this._vector3.z += (targetVertex.z - vertex.z) * influence;

                            }

                        }

                        this.renderList.pushVertex(this._vector3.x, this._vector3.y, this._vector3.z);

                    }

                    for (let f = 0, fl = faces.length; f < fl; f++) {

                        const face = faces[f];

                        material = isMultiMaterial === true
                            ? (object.material as MaterialType[])[face.materialIndex]
                            : object.material;

                        if (material === undefined) continue;

                        const side = material.side;

                        const v1 = this._vertexPool[face.a];
                        const v2 = this._vertexPool[face.b];
                        const v3 = this._vertexPool[face.c];

                        if (this.renderList.checkTriangleVisibility(v1, v2, v3) === false) continue;

                        const visible = this.renderList.checkBackfaceCulling(v1, v2, v3);

                        if (side !== DoubleSide) {

                            if (side === FrontSide && visible === false) continue;
                            if (side === BackSide && visible === true) continue;

                        }

                        this._face = this.getNextFaceInPool();

                        this._face.id = object.id;
                        this._face.v1.copy(v1);
                        this._face.v2.copy(v2);
                        this._face.v3.copy(v3);

                        this._face.normalModel.copy(face.normal);

                        if (visible === false && (side === BackSide || side === DoubleSide)) {

                            this._face.normalModel.negate();

                        }

                        this._face.normalModel.applyMatrix3(this._normalMatrix).normalize();

                        const faceVertexNormals = face.vertexNormals;

                        for (let n = 0, nl = Math.min(faceVertexNormals.length, 3); n < nl; n++) {

                            const normalModel = this._face.vertexNormalsModel[n];
                            normalModel.copy(faceVertexNormals[n]);

                            if (visible === false && (side === BackSide || side === DoubleSide)) {

                                normalModel.negate();

                            }

                            normalModel.applyMatrix3(this._normalMatrix).normalize();

                        }

                        this._face.vertexNormalsLength = faceVertexNormals.length;

                        const vertexUvs = faceVertexUvs[f];

                        if (vertexUvs !== undefined) {

                            for (let u = 0; u < 3; u++) {

                                this._face.uvs[u].copy(vertexUvs[u]);

                            }

                        }

                        this._face.color = face.color;
                        this._face.material = material;

                        this._face.z = (v1.positionScreen.z + v2.positionScreen.z + v3.positionScreen.z) / 3;
                        this._face.renderOrder = object.renderOrder;

                        this._renderData.elements.push(this._face);

                    }

                }

            } else if (object instanceof Line) {

                this._modelViewProjectionMatrix.multiplyMatrices(this._viewProjectionMatrix, this._modelMatrix);

                if (geometry instanceof BufferGeometry) {

                    const attributes = geometry.attributes;

                    if (attributes.position !== undefined) {

                        const positions = attributes.position.array;

                        for (let i = 0, l = positions.length; i < l; i += 3) {

                            this.renderList.pushVertex(positions[i], positions[i + 1], positions[i + 2]);

                        }

                        if (attributes.color !== undefined) {

                            const colors = attributes.color.array;

                            for (let i = 0, l = colors.length; i < l; i += 3) {

                                this.renderList.pushColor(colors[i], colors[i + 1], colors[i + 2]);

                            }

                        }

                        if (geometry.index !== null) {

                            const indices = geometry.index.array;

                            for (let i = 0, l = indices.length; i < l; i += 2) {

                                this.renderList.pushLine(indices[i], indices[i + 1]);

                            }

                        } else {

                            const step = object instanceof LineSegments ? 2 : 1;

                            for (let i = 0, l = (positions.length / 3) - 1; i < l; i += step) {

                                this.renderList.pushLine(i, i + 1);

                            }

                        }

                    }

                } else if (geometry instanceof Geometry) {

                    const vertices = object.geometry.vertices;

                    if (vertices.length === 0) continue;

                    v1 = this.getNextVertexInPool();
                    v1.positionScreen.copy(vertices[0]).applyMatrix4(this._modelViewProjectionMatrix);

                    const step = object instanceof LineSegments ? 2 : 1;

                    for (var v = 1, vl = vertices.length; v < vl; v++) {

                        v1 = this.getNextVertexInPool();
                        v1.positionScreen.copy(vertices[v]).applyMatrix4(this._modelViewProjectionMatrix);

                        if ((v + 1) % step > 0) continue;

                        v2 = this._vertexPool[this._vertexCount - 2];

                        this._clippedVertex1PositionScreen.copy(v1.positionScreen);
                        this._clippedVertex2PositionScreen.copy(v2.positionScreen);

                        if (this.clipLine(this._clippedVertex1PositionScreen, this._clippedVertex2PositionScreen) === true) {

                            // Perform the perspective divide
                            this._clippedVertex1PositionScreen.multiplyScalar(1 / this._clippedVertex1PositionScreen.w);
                            this._clippedVertex2PositionScreen.multiplyScalar(1 / this._clippedVertex2PositionScreen.w);

                            this._line = this.getNextLineInPool();

                            this._line.id = object.id;
                            this._line.v1.positionScreen.copy(this._clippedVertex1PositionScreen);
                            this._line.v2.positionScreen.copy(this._clippedVertex2PositionScreen);

                            this._line.z = Math.max(this._clippedVertex1PositionScreen.z, this._clippedVertex2PositionScreen.z);
                            this._line.renderOrder = object.renderOrder;

                            this._line.material = object.material;

                            if (object.material.vertexColors === VertexColors) {

                                this._line.vertexColors[0].copy(object.geometry.colors[v]);
                                this._line.vertexColors[1].copy(object.geometry.colors[v - 1]);

                            }

                            this._renderData.elements.push(this._line);

                        }

                    }

                }

            } else if (object instanceof Points) {

                this._modelViewProjectionMatrix.multiplyMatrices(this._viewProjectionMatrix, this._modelMatrix);

                if (geometry instanceof Geometry) {

                    const vertices = object.geometry.vertices;

                    for (let v = 0, vl = vertices.length; v < vl; v++) {

                        const vertex = vertices[v];

                        this._vector4.set(vertex.x, vertex.y, vertex.z, 1);
                        this._vector4.applyMatrix4(this._modelViewProjectionMatrix);

                        this.pushPoint(this._vector4, object, camera);

                    }

                } else if (geometry instanceof BufferGeometry) {

                    const attributes = geometry.attributes;

                    if (attributes.position !== undefined) {

                        const positions = attributes.position.array;

                        for (let i = 0, l = positions.length; i < l; i += 3) {

                            this._vector4.set(positions[i], positions[i + 1], positions[i + 2], 1);
                            this._vector4.applyMatrix4(this._modelViewProjectionMatrix);

                            this.pushPoint(this._vector4, object, camera);

                        }

                    }

                }

            } else if (object instanceof Sprite) {

                object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
                this._vector4.set(
                    this._modelMatrix.elements[12],
                    this._modelMatrix.elements[13],
                    this._modelMatrix.elements[14],
                    1
                );
                this._vector4.applyMatrix4(this._viewProjectionMatrix);

                this.pushPoint(this._vector4, object, camera);

            }

        }

        if (sortElements === true) {

            this._renderData.elements.sort(this.painterSort);

        }

        return this._renderData;

    };

    pushPoint(_vector4, object, camera) {

        let invW = 1 / _vector4.w;

        _vector4.z *= invW;

        if (_vector4.z >= -1 && _vector4.z <= 1) {

            this._sprite = this.getNextSpriteInPool();
            this._sprite.id = object.id;
            this._sprite.x = _vector4.x * invW;
            this._sprite.y = _vector4.y * invW;
            this._sprite.z = _vector4.z;
            this._sprite.renderOrder = object.renderOrder;
            this._sprite.object = object;

            this._sprite.rotation = object.rotation;

            this._sprite.scale.x = object.scale.x * Math.abs(this._sprite.x - (
                _vector4.x + camera.projectionMatrix.elements[0])
                / (_vector4.w + camera.projectionMatrix.elements[12]));
            this._sprite.scale.y = object.scale.y * Math.abs(this._sprite.y - (
                _vector4.y + camera.projectionMatrix.elements[5])
                / (_vector4.w + camera.projectionMatrix.elements[13]));

            this._sprite.material = object.material;

            this._renderData.elements.push(this._sprite);

        }

    }

    // Pools

    getNextObjectInPool() {

        if (this._objectCount === this._objectPoolLength) {

            const object = new RenderableObject();
            this._objectPool.push(object);
            this._objectPoolLength++;
            this._objectCount++;
            return object;

        }

        return this._objectPool[this._objectCount++];

    }

    getNextVertexInPool = () => {

        if (this._vertexCount === this._vertexPoolLength) {

            const vertex = new RenderableVertex();
            this._vertexPool.push(vertex);
            this._vertexPoolLength++;
            this._vertexCount++;
            return vertex;

        }

        return this._vertexPool[this._vertexCount++];

    };

    getNextFaceInPool() {

        if (this._faceCount === this._facePoolLength) {

            const face = new RenderableFace();
            this._facePool.push(face);
            this._facePoolLength++;
            this._faceCount++;
            return face;

        }

        return this._facePool[this._faceCount++];


    }

    getNextLineInPool() {

        if (this._lineCount === this._linePoolLength) {

            const line = new RenderableLine();
            this._linePool.push(line);
            this._linePoolLength++;
            this._lineCount++;
            return line;

        }

        return this._linePool[this._lineCount++];

    }

    getNextSpriteInPool() {

        if (this._spriteCount === this._spritePoolLength) {

            const sprite = new RenderableSprite();
            this._spritePool.push(sprite);
            this._spritePoolLength++;
            this._spriteCount++;
            return sprite;

        }

        return this._spritePool[this._spriteCount++];

    }

    //

    painterSort(a, b) {

        if (a.renderOrder !== b.renderOrder) {

            return a.renderOrder - b.renderOrder;

        } else if (a.z !== b.z) {

            return b.z - a.z;

        } else if (a.id !== b.id) {

            return a.id - b.id;

        } else {

            return 0;

        }

    }

    clipLine(s1: Vector4, s2: Vector4) {

        var alpha1 = 0, alpha2 = 1,

            // Calculate the boundary coordinate of each vertex for the near and far clip planes,
            // Z = -1 and Z = +1, respectively.

            bc1near = s1.z + s1.w,
            bc2near = s2.z + s2.w,
            bc1far = -s1.z + s1.w,
            bc2far = -s2.z + s2.w;

        if (bc1near >= 0 && bc2near >= 0 && bc1far >= 0 && bc2far >= 0) {

            // Both vertices lie entirely within all clip planes.
            return true;

        } else if ((bc1near < 0 && bc2near < 0) || (bc1far < 0 && bc2far < 0)) {

            // Both vertices lie entirely outside one of the clip planes.
            return false;

        } else {

            // The line segment spans at least one clip plane.

            if (bc1near < 0) {

                // v1 lies outside the near plane, v2 inside
                alpha1 = Math.max(alpha1, bc1near / (bc1near - bc2near));

            } else if (bc2near < 0) {

                // v2 lies outside the near plane, v1 inside
                alpha2 = Math.min(alpha2, bc1near / (bc1near - bc2near));

            }

            if (bc1far < 0) {

                // v1 lies outside the far plane, v2 inside
                alpha1 = Math.max(alpha1, bc1far / (bc1far - bc2far));

            } else if (bc2far < 0) {

                // v2 lies outside the far plane, v2 inside
                alpha2 = Math.min(alpha2, bc1far / (bc1far - bc2far));

            }

            if (alpha2 < alpha1) {

                // The line segment spans two boundaries, but is outside both of them.
                // (This can't happen when we're only clipping against just near/far but good
                //  to leave the check here for future usage if other clip planes are added.)
                return false;

            } else {

                // Update the s1 and s2 vertices to match the clipped line segment.
                s1.lerp(s2, alpha1);
                s2.lerp(s1, 1 - alpha2);

                return true;

            }

        }

    }
}
