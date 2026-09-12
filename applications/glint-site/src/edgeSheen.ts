import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";

// A soft outline catches light nearest the pointer. No orbit, running trace,
// hard head or trailing tail; the reflection stays connected to the cursor.
export function createEdgeSheen() {
  const material = new ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      size: { value: new Vector2(1, 1) },
      light: { value: new Vector2(0, 0) },
      strength: { value: 0 },
    },
    vertexShader: `
      varying vec2 point;
      uniform vec2 size;
      void main() {
        point = uv * (size + 0.12) - (size + 0.12) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 point;
      uniform vec2 size;
      uniform vec2 light;
      uniform float strength;
      void main() {
        vec2 halfSize = size * 0.5;
        float radius = min(0.18, min(halfSize.x, halfSize.y));
        vec2 q = abs(point) - halfSize + radius;
        float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        float nearby = exp(-dot(point - light, point - light) / 5.0);
        float core = exp(-pow(edge / 0.009, 2.0));
        float feather = exp(-pow(edge / 0.025, 2.0));
        float alpha = (core * 0.24 + feather * 0.06) * (0.18 + nearby * 0.82) * strength;
        vec3 silver = mix(vec3(0.60), vec3(0.91), nearby * core);
        gl_FragColor = vec4(silver, alpha);
      }
    `,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.position.z = 3;
  return { mesh, material };
}
