import {
    Object3D,
    REVISION,
    Box2,
    Color,
    Vector3,
    Matrix3,
    Matrix4,
    Camera,
    Scene,
    FaceColors,
    VertexColors,
    AmbientLight,
    DirectionalLight,
    PointLight,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    MeshNormalMaterial,
    MeshBasicMaterial,
    PointsMaterial,
    SpriteMaterial,
    LineDashedMaterial,
    LineBasicMaterial,
} from 'three';
import React from 'react';
import {Component} from 'reactxp';
import {default as Svg, SvgPath as Path}
    from 'reactxp-imagesvg';
import Projector, {
    RenderableSprite,
    RenderableFace,
    RenderableLine, RenderableVertex, RenderData,
} from './Projector';
import {SvgCommonProps, SvgPathProps} from "reactxp-imagesvg/dist/common/Types";

export interface ColorType extends Color {
    isColor: true;
}

export interface LineBasicMaterialType extends LineBasicMaterial {
    isLineBasicMaterial: true;
}

export interface LineDashedMaterialType extends LineDashedMaterial {
    isLineDashedMaterial: true;
}

export interface PointsMaterialType extends PointsMaterial {
    isPointsMaterial: true;
}

export interface SpriteMaterialType extends SpriteMaterial {
    isSpriteMaterial: true;
}

export interface BasicMaterialType extends MeshBasicMaterial {
    isBasicMaterial: true;
}

export interface LambertMaterialType extends MeshLambertMaterial {
    isLambertMaterial: true;
}

export interface PhongMaterialType extends MeshPhongMaterial {
    isPhongMaterial: true;
}

export interface StandardMaterialType extends MeshStandardMaterial {
    isStandardMaterial: true;
}

export interface NormalMaterialType extends MeshNormalMaterial {
    isNormalMaterial: true;
}

export interface AmbientLightType extends AmbientLight {
    isAmbientLight: true;
}

export interface DirectionalLightType extends DirectionalLight {
    isDirectionalLight: true;
}

export interface PointLightType extends PointLight {
    isPointLight: true;
}

export type MaterialType = NormalMaterialType |
    LambertMaterialType | PhongMaterialType | StandardMaterialType |
    BasicMaterialType | PointsMaterialType | SpriteMaterialType | LineDashedMaterialType | LineBasicMaterialType;

function isLambertMaterial(arg: MaterialType): arg is LambertMaterialType {
    return (arg as LambertMaterialType).isLambertMaterial;
}

function isPhongMaterial(arg: MaterialType): arg is PhongMaterialType {
    return (arg as PhongMaterialType).isPhongMaterial;
}

function isNormalMaterial(arg: MaterialType): arg is NormalMaterialType {
    return (arg as NormalMaterialType).isNormalMaterial;
}

function isStandardMaterial(arg: MaterialType): arg is StandardMaterialType {
    return (arg as StandardMaterialType).isStandardMaterial;
}

function isBasicMaterial(arg: MaterialType): arg is BasicMaterialType {
    return (arg as BasicMaterialType).isBasicMaterial;
}

function isPointsMaterial(arg: MaterialType): arg is PointsMaterialType {
    return (arg as PointsMaterialType).isPointsMaterial;
}

function isSpriteMaterial(arg: MaterialType): arg is SpriteMaterialType {
    return (arg as SpriteMaterialType).isSpriteMaterial;
}

function isLineDashedMaterial(arg: MaterialType): arg is LineDashedMaterialType {
    return (arg as LineDashedMaterialType).isLineDashedMaterial;
}

function isLineBasicMaterial(arg: MaterialType): arg is LineBasicMaterialType {
    return (arg as LineBasicMaterialType).isLineBasicMaterial;
}

export type LightType = AmbientLightType | DirectionalLightType | PointLightType;

function isAmbientLight(arg: LightType): arg is AmbientLightType {
    return (arg as AmbientLightType).isAmbientLight;
}

function isDirectionalLight(arg: LightType): arg is DirectionalLightType {
    return (arg as DirectionalLightType).isDirectionalLight;
}

function isPointLight(arg: LightType): arg is PointLightType {
    return (arg as PointLightType).isPointLight;
}

export interface Renderer {

    THREERender(scene: Scene, camera: Camera): void;

    setSize(width: number, height: number, updateStyle?: boolean): void;
}

/**
 * @author mrdoob / http://mrdoob.com/
 */

export class SVGObject extends Object3D {

    node: SVGElement;

    constructor(node: SVGElement) {
        super();
        this.node = node;
    }
}

interface SVGRendererProps {
    width: number;
    height: number;
    scene: Scene;
    camera: Camera;
    animate: (timestamp: number, renderer: Function) => void;
}

export default class SVGRenderer extends Component<SVGRendererProps, {}> implements Renderer {
    _timestamp: number = 0;
    _renderData: RenderData = {objects: [], elements: [], lights: []};
    _elements: any[] = [];
    _lights: (AmbientLightType | DirectionalLightType | PointLightType)[] = [];
    _projector = new Projector();
    _svgWidth: number = 0;
    _svgHeight: number = 0;
    _svgWidthHalf = 0;
    _svgHeightHalf = 0;

    _v1: RenderableSprite|RenderableLine|RenderableFace;
    _v2: RenderableSprite|RenderableLine|RenderableFace;
    _v3: RenderableSprite|RenderableLine|RenderableFace;

    _clipBox = new Box2();
    _elemBox = new Box2();

    _color = new Color();
    _diffuseColor = new Color();
    _ambientLight = new Color();
    _directionalLights = new Color();
    _pointLights = new Color();
    _clearColor = new Color();
    _clearAlpha = 1;

    _vector3 = new Vector3(); // Needed for PointLight
    _centroid = new Vector3();
    _normal = new Vector3();
    _normalViewMatrix = new Matrix3();

    _viewMatrix = new Matrix4();
    _viewProjectionMatrix = new Matrix4();

    _svgPathPool: Path[] = [];
    _svgNode: SvgPathProps = {d: ''};
    _pathCount = 0;

    _currentPath: string = '';
    _currentStyle: {} = {};

    _quality = 1;
    _precision: string | null = null;
    state = {
        viewBox: '',
        width: 0,
        height: 0,
        children: [],
        style: {},
    };


    constructor(props: SVGRendererProps) {
        super(props);
        console.log('THREE.SVGRenderer', REVISION);
    }

    componentDidMount = (): void => {
        const {width, height} = this.props;
        this.setSize(width, height);
        this.props.animate(this._timestamp, this.THREERender);
    };
    componentDidUpdate(): void {
        console.log(this.state);
    }

    autoClear: boolean = true;
    sortObjects: boolean = true;
    sortElements: boolean = true;

    info = {

        render: {

            vertices: 0,
            faces: 0

        }

    };

    setQuality = (quality: "high" | "low") => {

        switch (quality) {

            case "high":
                this._quality = 1;
                break;
            case "low":
                this._quality = 0;
                break;
            default:
                this._quality = 1;
        }

    };

    setClearColor = (color: Color, alpha: number) => {

        this._clearColor.set(color);
        this._clearAlpha = alpha !== undefined ? alpha : 1;

    };

    setPixelRatio = () => {
    };

    setSize = (width: number, height: number) => {
        this._svgWidth = width;
        this._svgHeight = height;

        this._svgWidthHalf = this._svgWidth / 2;
        this._svgHeightHalf = this._svgHeight / 2;

        this.setState({
            viewBox: (-this._svgWidthHalf) + ' ' + (-this._svgHeightHalf) + ' ' + this._svgWidth + ' ' + this._svgHeight,
            width: this._svgWidth,
            height: this._svgHeight,
        });

        this._clipBox.min.set(-this._svgWidthHalf, -this._svgHeightHalf);
        this._clipBox.max.set(this._svgWidthHalf, this._svgHeightHalf);

    };

    setPrecision = (precision: string) => {
        this._precision = precision;
    };

    removeChildNodes() {

        this._pathCount = 0;

        this.setState({children: []})

    }

    static getSvgColor(color: Color, opacity?: number): SvgCommonProps {

        const arg = Math.floor(color.r * 255) + ',' + Math.floor(color.g * 255) + ',' + Math.floor(color.b * 255);

        if (opacity === undefined || opacity === 1){
            //@ts-ignore
            return 'rgb(' + arg + ')';
        }
        return {
            //@ts-ignore
            backgroundColor: `rgb(${arg})`,
            fillOpacity: opacity,
        };

    }

    convert = (c: number): string => {

        return this._precision !== null ? c.toFixed(Number(this._precision)) : `${c}`;

    };

    clear = () => {

        this.removeChildNodes();
        const {
            //@ts-ignore
            backgroundColor,
            fillOpacity,
        } = SVGRenderer.getSvgColor(this._clearColor, this._clearAlpha);
        this.setState({
            style: {
                ...this.state.style,
                backgroundColor,
                fillOpacity,
            }
        });

    };

    // todo żeby nie kłóciło się z reactem
    THREERender = (scene: Scene, camera: Camera) => {
        if (camera instanceof Camera === false) {
            //todo throw
            console.error('THREE.SVGRenderer.render: camera is not an instance of THREE.Camera.');
            return;
        }

        const background = scene.background;

        if (background && (background as ColorType).isColor) {

            this.removeChildNodes();
            const {
                //@ts-ignore
                backgroundColor,
                fillOpacity,
            } = SVGRenderer.getSvgColor(background as Color);
            this.setState({
                style: {
                    ...this.state.style,
                    backgroundColor,
                    fillOpacity,
                },
            });

        } else if (this.autoClear === true) {
            this.clear();
        }

        this.info.render.vertices = 0;
        this.info.render.faces = 0;

        this._viewMatrix.copy(camera.matrixWorldInverse);
        this._viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, this._viewMatrix);

        this._renderData = this._projector.projectScene(scene, camera, this.sortObjects, this.sortElements);
        this._elements = this._renderData.elements;
        this._lights = this._renderData.lights;

        this._normalViewMatrix.getNormalMatrix(camera.matrixWorldInverse);

        this.calculateLights(this._lights);

        // reset accumulated path

        this._currentPath = '';
        this._currentStyle = {};

        for (let e = 0, el = this._elements.length; e < el; e++) {

            const element = this._elements[e];
            const material = element.material;

            if (material === undefined || material.opacity === 0) continue;

            this._elemBox.makeEmpty();

            if (element instanceof RenderableSprite) {

                this._v1 = element;
                this._v1.x *= this._svgWidthHalf;
                this._v1.y *= -this._svgHeightHalf;

                this.renderSprite(this._v1, element, material);

            } else if (element instanceof RenderableLine) {

                this._v1 = element.v1;
                this._v2 = element.v2;

                this._v1.positionScreen.x *= this._svgWidthHalf;
                this._v1.positionScreen.y *= -this._svgHeightHalf;
                this._v2.positionScreen.x *= this._svgWidthHalf;
                this._v2.positionScreen.y *= -this._svgHeightHalf;

                this._elemBox.setFromPoints([this._v1.positionScreen, this._v2.positionScreen]);

                if (this._clipBox.intersectsBox(this._elemBox) === true) {

                    this.renderLine(this._v1, this._v2, element, material);

                }

            } else if (element instanceof RenderableFace) {

                this._v1 = element.v1;
                this._v2 = element.v2;
                this._v3 = element.v3;

                if (this._v1.positionScreen.z < -1 || this._v1.positionScreen.z > 1) continue;
                if (this._v2.positionScreen.z < -1 || this._v2.positionScreen.z > 1) continue;
                if (this._v3.positionScreen.z < -1 || this._v3.positionScreen.z > 1) continue;

                this._v1.positionScreen.x *= this._svgWidthHalf;
                this._v1.positionScreen.y *= -this._svgHeightHalf;
                this._v2.positionScreen.x *= this._svgWidthHalf;
                this._v2.positionScreen.y *= -this._svgHeightHalf;
                this._v3.positionScreen.x *= this._svgWidthHalf;
                this._v3.positionScreen.y *= -this._svgHeightHalf;

                this._elemBox.setFromPoints([
                    this._v1.positionScreen,
                    this._v2.positionScreen,
                    this._v3.positionScreen
                ]);

                if (this._clipBox.intersectsBox(this._elemBox) === true) {

                    this.renderFace3(this._v1, this._v2, this._v3, element, material);

                }

            }

        }

        this.flushPath(); // just to flush last svg:path

        scene.traverseVisible((object: Object3D) => {

            if (object instanceof SVGObject) {

                this._vector3.setFromMatrixPosition(object.matrixWorld);
                this._vector3.applyMatrix4(this._viewProjectionMatrix);

                if (this._vector3.z < -1 || this._vector3.z > 1) return;

                const x = this._vector3.x * this._svgWidthHalf;
                const y = -this._vector3.y * this._svgHeightHalf;
                //todo dokończyć node
                const {node} = object;
                node.setAttribute('transform', 'translate(' + x + ',' + y + ')');
                this.setState({
                    children: [
                        ...this.state.children,
                        node,
                    ]
                });

            }

        });

    };
    render = () => <Svg
        height={this.state.width?this.state.height:400}
        width={this.state.width?this.state.width:400}
        viewBox={this.state.viewBox}
    >
        {
            this.state.children.map((el, index) => <Path key={index} {...el}/>)
        }
    </Svg>;

    calculateLights(lights: (AmbientLightType | DirectionalLightType | PointLightType)[]) {

        this._ambientLight.setRGB(0, 0, 0);
        this._directionalLights.setRGB(0, 0, 0);
        this._pointLights.setRGB(0, 0, 0);

        for (let l = 0, ll = lights.length; l < ll; l++) {

            const light = lights[l];
            const lightColor = light.color;


            if (isAmbientLight(light)) {

                this._ambientLight.r += lightColor.r;
                this._ambientLight.g += lightColor.g;
                this._ambientLight.b += lightColor.b;

            } else {
                // @ts-ignore
                if (isDirectionalLight(light)) {

                    this._directionalLights.r += lightColor.r;
                    this._directionalLights.g += lightColor.g;
                    this._directionalLights.b += lightColor.b;

                } else {
                    // @ts-ignore
                    if (isPointLight(light)) {

                        this._pointLights.r += lightColor.r;
                        this._pointLights.g += lightColor.g;
                        this._pointLights.b += lightColor.b;

                    }
                }
            }

        }

    }

    calculateLight(lights: (AmbientLightType | DirectionalLightType | PointLightType)[], position: Vector3, normal: Vector3, color: Color) {

        for (let l = 0, ll = lights.length; l < ll; l++) {

            const light = lights[l];
            const lightColor = light.color;

            if (isDirectionalLight(light)) {

                const lightPosition = this._vector3.setFromMatrixPosition(light.matrixWorld).normalize();

                let amount = normal.dot(lightPosition);

                if (amount <= 0) continue;

                amount *= light.intensity;

                color.r += lightColor.r * amount;
                color.g += lightColor.g * amount;
                color.b += lightColor.b * amount;

            } else if (isPointLight(light)) {

                const lightPosition = this._vector3.setFromMatrixPosition(light.matrixWorld);

                let amount = normal.dot(this._vector3.subVectors(lightPosition, position).normalize());

                if (amount <= 0) continue;

                amount *= light.distance === 0 ? 1 : 1 - Math.min(position.distanceTo(lightPosition) / light.distance, 1);

                if (amount === 0) continue;

                amount *= light.intensity;

                color.r += lightColor.r * amount;
                color.g += lightColor.g * amount;
                color.b += lightColor.b * amount;

            }

        }

    }

    renderSprite(
        v1: RenderableVertex,
        element: RenderableSprite,
        material: SpriteMaterialType | PointsMaterialType) {

        let scaleX = element.scale.x * this._svgWidthHalf;
        let scaleY = element.scale.y * this._svgHeightHalf;
        let path = '';
        let style = {};

        if (isSpriteMaterial(material) || isPointsMaterial(material)) {
            if (isPointsMaterial(material)) {

                scaleX *= material.size;
                scaleY *= material.size;

            }
            path = 'M' + this.convert(v1.x - scaleX * 0.5) + ',' + this.convert(v1.y - scaleY * 0.5) + 'h'
                + this.convert(scaleX) + 'v' + this.convert(scaleY) + 'h' + this.convert(-scaleX) + 'z';
            //style = 'fill:' + SVGRenderer.getSvgColor(material.color, material.opacity);
            style = {
                fillColor: `${SVGRenderer.getSvgColor(material.color, material.opacity)}`,
            }

        }

        this.addPath(style, path);

    }

    renderLine(
        //todo RenderableVertex is too generic
        v1: RenderableVertex,
        v2: RenderableVertex,
        element: RenderableLine,
        material: LineDashedMaterialType | BasicMaterialType) {

        const path = 'M' + this.convert(v1.positionScreen.x) + ',' + this.convert(v1.positionScreen.y) + 'L'
            + this.convert(v2.positionScreen.x) + ',' + this.convert(v2.positionScreen.y);
        let style = {};
        if (isLineBasicMaterial(material)) {

            /*var style = 'fill:none;stroke:' + SVGRenderer.getSvgColor(material.color, material.opacity) + ';stroke-width:'
                //todo workaround
                + material.linewidth + ';stroke-linecap:' + material.linecap;*/
            style = {
                fillColor: 'none',
                strokeColor: SVGRenderer.getSvgColor(material.color, material.opacity),
                strokeWidth: material.linewidth,
                //todo linecap
            };


        } else if (isLineDashedMaterial(material)) {
            //todo workaround
            //style = style + ';stroke-dasharray:' + material.dashSize + "," + material.gapSize;
            style = {
                fillColor: 'none',
                strokeColor: SVGRenderer.getSvgColor(material.color, material.opacity),
                strokeWidth: material.linewidth,
                //todo linecap
            };

        }

        this.addPath(style, path);
    }

    renderFace3(
        v1: RenderableVertex,
        v2: RenderableVertex,
        v3: RenderableVertex,
        element: RenderableFace, material: LambertMaterialType | PhongMaterialType | NormalMaterialType | StandardMaterialType) {

        this.info.render.vertices += 3;
        this.info.render.faces++;

        const path = 'M' + this.convert(v1.positionScreen.x) + ',' + this.convert(v1.positionScreen.y) + 'L'
            + this.convert(v2.positionScreen.x) + ',' + this.convert(v2.positionScreen.y) + 'L' + this.convert(v3.positionScreen.x)
            + ',' + this.convert(v3.positionScreen.y) + 'z';
        let style = {};

        if (isBasicMaterial(material)) {

            this._color.copy(material.color);

            if (material.vertexColors === FaceColors || material.vertexColors === VertexColors) {

                this._color.multiply(element.color);

            }

        } else if (isLambertMaterial(material) || isPhongMaterial(material) || isStandardMaterial(material)) {

            this._diffuseColor.copy(material.color);

            if (material.vertexColors === FaceColors || material.vertexColors === VertexColors) {

                this._diffuseColor.multiply(element.color);

            }

            this._color.copy(this._ambientLight);

            this._centroid.copy(v1.positionWorld).add(v2.positionWorld).add(v3.positionWorld).divideScalar(3);

            this.calculateLight(this._lights, this._centroid, element.normalModel, this._color);

            this._color.multiply(this._diffuseColor).add(material.emissive);

        } else if (isNormalMaterial(material)) {

            this._normal.copy(element.normalModel).applyMatrix3(this._normalViewMatrix);

            this._color.setRGB(this._normal.x, this._normal.y, this._normal.z).multiplyScalar(0.5).addScalar(0.5);

        }

        if (!isStandardMaterial(material) && !isNormalMaterial(material) && material.wireframe) {

            /*style = 'fill:none;stroke:' + SVGRenderer.getSvgColor(this._color, material.opacity) + ';stroke-width:'
                + material.wireframeLinewidth + ';stroke-linecap:' + material.wireframeLinecap + ';stroke-linejoin:'
                + material.wireframeLinejoin;*/
            style = {
                fillColor: 'none',
                strokeColor: SVGRenderer.getSvgColor(this._color, material.opacity),
                strokeWidth: material.wireframeLinewidth,
                //todo linecap linejoin
            };

        } else {

            style = {
                fillColor: SVGRenderer.getSvgColor(this._color, material.opacity),
            };

        }

        this.addPath(style, path);

    }

    addPath(style: {}, path: string) {

        if (this._currentStyle === style) {

            this._currentPath += path;

        } else {

            this.flushPath();

            this._currentStyle = style;
            this._currentPath = path;

        }

    }

    flushPath = () => {
        if (this._currentPath) {
            this._svgNode = {d: this._currentPath, ...this._currentStyle};
            this._pathCount++;

            this.setState({
                children: [
                    ...this.state.children,
                    this._svgNode,
                ],
            });

        }

        this._currentPath = '';
        this._currentStyle = {};

    };

    //todo do usunięcia
    getPathNode(id: number) {

        if (this._svgPathPool[id] == null) {

            this._svgPathPool[id] = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            if (this._quality === 0) {

                this._svgPathPool[id].setAttribute('shape-rendering', 'crispEdges'); //optimizeSpeed

            }

            return this._svgPathPool[id];

        }

        return this._svgPathPool[id];

    }
}
