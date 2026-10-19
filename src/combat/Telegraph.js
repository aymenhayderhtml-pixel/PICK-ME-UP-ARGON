import * as THREE from 'three';

export class Telegraph {
  constructor(scene) {
    this.scene = scene;
    this.indicators = [];
  }

  showSector(position, facingYaw, radius, angleRad, duration) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    const startAngle = -angleRad / 2;
    const endAngle = angleRad / 2;
    shape.absarc(0, 0, radius, startAngle, endAngle, false);
    shape.lineTo(0, 0);

    const geo = new THREE.ShapeGeometry(shape, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff1122,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    // Rotate so 0 angle aligns with facingYaw
    mesh.rotation.z = -facingYaw - Math.PI / 2;
    mesh.position.set(position.x, 0.05, position.z);
    this.scene.add(mesh);

    this.indicators.push({
      type: 'sector',
      mesh,
      mat,
      geo,
      duration,
      elapsed: 0,
    });
  }

  showCircle(position, startRadius, endRadius, duration) {
    const geo = new THREE.RingGeometry(Math.max(0.1, startRadius - 0.3), startRadius, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff1122,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.05, position.z);
    this.scene.add(mesh);

    this.indicators.push({
      type: 'circle',
      mesh,
      mat,
      geo,
      position: position.clone(),
      startRadius,
      endRadius,
      duration,
      elapsed: 0,
    });
  }

  showLine(position, facingYaw, length, width, duration) {
    const geo = new THREE.PlaneGeometry(width, length);
    // Align center forward from boss position
    geo.translate(0, length / 2, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff1122,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -facingYaw - Math.PI;
    mesh.position.set(position.x, 0.05, position.z);
    this.scene.add(mesh);

    this.indicators.push({
      type: 'line',
      mesh,
      mat,
      geo,
      duration,
      elapsed: 0,
    });
  }

  update(delta) {
    for (let i = this.indicators.length - 1; i >= 0; i--) {
      const ind = this.indicators[i];
      ind.elapsed += delta;
      const progress = Math.min(1.0, ind.elapsed / ind.duration);

      // Grow opacity over time
      ind.mat.opacity = 0.2 + progress * 0.55;

      // Expand circle if circle type
      if (ind.type === 'circle') {
        const curR = ind.startRadius + (ind.endRadius - ind.startRadius) * progress;
        ind.mesh.scale.set(curR / ind.startRadius, curR / ind.startRadius, 1);
      }

      if (ind.elapsed >= ind.duration) {
        this.destroyIndicator(i);
      }
    }
  }

  destroyIndicator(index) {
    const ind = this.indicators[index];
    if (ind) {
      this.scene.remove(ind.mesh);
      if (ind.geo) ind.geo.dispose();
      if (ind.mat) ind.mat.dispose();
    }
    this.indicators.splice(index, 1);
  }

  clear() {
    for (const ind of this.indicators) {
      this.scene.remove(ind.mesh);
      if (ind.geo) ind.geo.dispose();
      if (ind.mat) ind.mat.dispose();
    }
    this.indicators = [];
  }
}
