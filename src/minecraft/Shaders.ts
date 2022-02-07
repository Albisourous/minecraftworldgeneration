// Minecraft Shaders
export const chunkVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec4 aNorm;
    attribute vec2 vertTexCoord;

    varying vec3 fragCameraPosition;
    varying vec4 lightDir;
    varying vec4 normal;
    varying vec3 fragVertPosition;
    varying vec2 fragTexCoord;
 
    uniform vec4 lightPosition;
    uniform vec3 cameraPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
	uniform mat4 mProj;

    void main () {
		//  Convert vertex to camera coordinates and the NDC
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
        
        //  Compute light direction (world coordinates)
        lightDir = lightPosition - vec4(vertPosition, 1.0);
		
        //  Pass along the vertex normal (world coordinates)
        normal = aNorm;
        fragCameraPosition = cameraPosition;
        fragVertPosition = vertPosition;
        fragTexCoord = vertTexCoord;
    }
`;

export const chunkFSText = `
    precision mediump float;

    uniform sampler2D sampler;

    varying vec4 lightDir;
    varying vec4 normal;
    varying vec3 fragCameraPosition;
    varying vec3 fragVertPosition;
    varying vec2 fragTexCoord;

    void main () {
        float dist = distance(fragCameraPosition, fragVertPosition);
        float opacity = clamp(dist / 500.0, 0.0, 1.0);

        vec4 color = texture2D(sampler, fragTexCoord);
        gl_FragColor = color * vec4(1.0, 1.0, 1.0, 1.0 - opacity);
        //gl_FragColor = color;
        //gl_FragColor[3] = 1.0;
    }
`;

export const crosshairVSText = `
    precision mediump float;

    attribute vec4 vertPosition;

    uniform mat4 mWorld;
    uniform mat4 mProj;
    uniform mat4 mView;

    void main () {
        // Removing view matrix allows transforming from
        // model-space directly to screen space
        gl_Position = mProj * mWorld * vertPosition;
    }
`;

export const crosshairFSText = `
    precision mediump float;

    void main () {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;