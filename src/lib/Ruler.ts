import type { Vec2, Vec3, Mat3 } from '$lib/shared';
import { sqrt, dot, subtract, multiply, inv } from 'mathjs';

export class Ruler {
	private points: [Vec2, Vec2] = null; // cache
	private rawPoints: [Vec3, Vec3] = [null, null];
	private transform: Mat3;

	isFull() {
		return this.rawPoints.every((p) => p != null);
	}

	add(point: Vec3) {
		if (this.isFull()) throw Error('ruler full');

		point = (multiply(inv(this.transform), point) as unknown) as Vec3;

		this.rawPoints[0] == null ? (this.rawPoints[0] = point) : (this.rawPoints[1] = point);
	}

	get2d(): [Vec2, Vec2] {
		if (this.points == null) {
			const points = this.rawPoints.map((p) =>
				p ? ((multiply(this.transform, p) as unknown) as Vec3) : null
			) as [Vec3, Vec3];

			this.points = points.map((p) => (p ? [p[0] / p[2], p[1] / p[2]] : null)) as [Vec2, Vec2];
		}
		return [...this.points];
	}

	getMidPoint(): Vec2 {
		const points = this.get2d();
		return points[0].map((x, i) => (x + points[1][i]) / 2) as Vec2;
	}

	getLength() {
		if (!this.isFull()) return 0;

		const p = this.get2d();
		const v = subtract(p[0], p[1]) as Vec2;
		return sqrt(dot(v, v));
	}

	setTransform(transform: Mat3) {
		this.points = null;
		this.transform = transform;
	}
}
