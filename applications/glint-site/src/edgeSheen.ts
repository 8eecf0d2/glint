import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";

// A short, feathered reflection travels around a rounded rectangle. The rest of
// the perimeter is fully transparent: this is never a persistent border stroke.
export function createEdgeSheen() {
  const material = new ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      size: { value: new Vector2(1, 1) },
      head: { value: 0 },
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
      uniform float head;
      uniform float strength;
      void main() {
        vec2 halfSize = size * 0.5;
        float radius = min(0.18, min(halfSize.x, halfSize.y));
        vec2 q = abs(point) - halfSize + radius;
        float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        float angle = atan(point.y / halfSize.y, point.x / halfSize.x);
        float behind = mod(head - angle + 6.2831853, 6.2831853);
        float tail = exp(-behind * 2.5) * (1.0 - smoothstep(0.0, 1.8, behind));
        float core = exp(-pow(edge / 0.012, 2.0));
        float feather = exp(-pow(edge / 0.045, 2.0));
        float alpha = (core * 0.8 + feather * 0.2) * tail * strength;
        // The feather gives a white highlight definition against the pale canvas.
        vec3 silver = mix(vec3(0.46), vec3(1.0), core * exp(-behind * 4.0));
        gl_FragColor = vec4(silver, alpha);
      }
    `,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.position.z = 3;
  return { mesh, material };
}
