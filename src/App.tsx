import React from 'react';
import RX from 'reactxp';
/*import {default as Svg, SvgPath as Path, SvgRect as Rect}
    from 'reactxp-imagesvg';*/
import {
    Camera,
    Scene,
    PerspectiveCamera,
    Color,
    BufferGeometry,
    Float32BufferAttribute,
    LineDashedMaterial,
    LineBasicMaterial,
    Line
} from 'three';
import {Dimensions} from "react-native";
import SVGRenderer from "./ThreeReactNativeSvg/SVGRenderer";

export interface screenSize {
    screenWidth: number;
    screenHeight: number;
}
export const getScreenSize = (): screenSize => ({
    // since window can be smaller than screen, so this is what we want
    screenWidth: Math.round(Dimensions.get('window').width),
    screenHeight: Math.round(Dimensions.get('window').height),
});

const _styles = {
    main: RX.Styles.createViewStyle({
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    }),

    title: RX.Styles.createTextStyle({
        fontWeight: 'bold',
        fontSize: 36,
        textAlign: 'center',
    }),

    label: RX.Styles.createTextStyle({
        marginTop: 10,
        textAlign: 'center',
        fontSize: 16,
    }),

    name: RX.Styles.createTextStyle({
        fontWeight: 'bold',
        fontSize: 36,
        color: '#42B74F',
    }),

    links: RX.Styles.createViewStyle({
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    }),

    link: RX.Styles.createLinkStyle({
        textDecorationLine: 'underline',
        paddingRight: 5,
        paddingLeft: 5,
        color: '#0070E0',
    }),
};
let mousepos = {x: 0, y: 0};

export class App extends RX.Component {
    camera: Camera = new PerspectiveCamera(33, 500 / 500, 0.1, 100);
    scene = new Scene();
    screenSize: screenSize = getScreenSize();

    constructor(props: {}) {
        super(props);
        this.init();
    }

    init = () => {

        this.camera.position.z = 10;


        this.scene.background = new Color(0, 0, 0);

        //

        const vertices = [];
        const divisions = 50;

        for (let i = 0; i <= divisions; i++) {

            const v = (i / divisions) * (Math.PI * 2);

            const x = Math.sin(v);
            const z = Math.cos(v);

            vertices.push(x, 0, z);

        }

        const geometry = new BufferGeometry();
        geometry.addAttribute('position', new Float32BufferAttribute(vertices, 3));

        //

        for (let i = 1; i <= 3; i++) {

            const material = new LineBasicMaterial({
                color: Math.random() * 0xffffff,
                linewidth: 10
            });
            const line = new Line(geometry, material);
            line.scale.setScalar(i / 3);
            this.scene.add(line);

        }

        const material = new LineDashedMaterial({
            color: 'blue',
            linewidth: 1,
            dashSize: 10,
            gapSize: 10
        });
        const line = new Line(geometry, material);
        line.scale.setScalar(2);
        this.scene.add(line);


    };
    count: number = 0;
    animate = (timestamp: number, THREERenderer: Function) => {

        let time: number;
        const animationLoop = (timeStamp: number): void=>{
            //const time = performance.now() / 1000;
            if (timestamp !== undefined) {
                timestamp = timeStamp;
            }
            time = timeStamp / 1000;

            this.scene.traverse((child): void=> {

                child.rotation.x = this.count + (time / 3);
                child.rotation.z = this.count + (time / 4);
                child.rotation.y = mousepos ? mousepos.y : 0;

                this.count++;

            });

            THREERenderer(this.scene, this.camera);
            requestAnimationFrame(animationLoop);
        };

        animationLoop(timestamp);
    };

    renderer = <SVGRenderer
        width={this.screenSize.screenWidth}
        height={500} scene={this.scene}
        camera={this.camera}
        animate={this.animate}
    />;
    public render() {
        return (
            <RX.View style={_styles.main}>
                <RX.View>
                    <RX.Text style={_styles.title}>Welcome to <RX.Text style={_styles.name}>ReactXP</RX.Text></RX.Text>
                    <RX.Text style={_styles.label}>To get started, edit /src/App.tsx</RX.Text>
                    {/*<Svg height={200} width={200}>
                        <Path
                            fillColor={'orange'}
                            d={'M 0 0 h 20 v 20 z'}
                        />
                        <Rect
                            fillColor={'blue'}
                            x={10}
                            y={20}
                            width={30}
                            height={40}
                        />
                    </Svg>*/}
                    {this.renderer}
                </RX.View>
                <RX.View style={_styles.links}>
                    <RX.Link url={'https://github.com/Microsoft/reactxp'} style={_styles.link}>GitHub</RX.Link>
                    <RX.Link url={'https://microsoft.github.io/reactxp'} style={_styles.link}>Docs</RX.Link>
                    <RX.Link
                        url={'https://github.com/Microsoft/reactxp/tree/master/samples'}
                        style={_styles.link}>Samples</RX.Link>
                    <RX.Link
                        url={'https://github.com/Microsoft/reactxp/tree/master/extensions'}
                        style={_styles.link}>Extensions</RX.Link>
                </RX.View>
            </RX.View>
        );
    }
}
