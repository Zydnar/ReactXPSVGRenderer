# ReactXP THREE SVGRenderer

> Disclaimer: This project was made only to prove it's possible to port Three SVG renderer into ReactXP and is provided "AS IS". As you may know already original browser version was slow and is not intended for heavy 3D animations.

Why not use it in production:

- it's slow especially on mobile devices, but if you'll find a way to speed this up feel free to fork it or PR back solution
- ReactXP has not implemented all SVG features, SVGRenderer use (at least in definitions)
- original version is not complete (it does not implement all features eg. canvas renderer have), just take a deeper look into code

Why use it:

- it may be really fun to use for 2D animations

Current example is inspired by https://threejs.org/examples/svg_lines.html 

## Tips

- uncomment commented out plugin in babel.config.js for WEB target
- while switching from WEB to other targets remember to comment out module-resolver plugin and to clear react-native and babel cache (in Windows works deleting contents of %appdata%/local/temp)

![Android Screenshot](D:\test\android SS.jpg)