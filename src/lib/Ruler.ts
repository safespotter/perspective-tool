import type { Vec2, Vec3, Mat3 } from '$lib/shared';
import { sqrt, dot, subtract, multiply, inv } from 'mathjs';

export class Ruler {
	private viewPoints: [Vec2, Vec2] = null; // cache
	private realPoints: [Vec2, Vec2] = null; // cache
	private rawPoints: [Vec3, Vec3] = [null, null];
	private viewTransform: Mat3;
	private realTransform: Mat3;

	isFull() {
		return this.rawPoints.every((p) => p != null);
	}

	add(point: Vec3) {
		if (this.isFull()) throw Error('ruler full');

		point = (multiply(inv(this.viewTransform), point) as unknown) as Vec3;

		this.rawPoints[0] == null ? (this.rawPoints[0] = point) : (this.rawPoints[1] = point);
	}

	get2d(): [Vec2, Vec2] {
		if (this.viewPoints == null) {
			const points = this.rawPoints.map((p) =>
				p ? ((multiply(this.viewTransform, p) as unknown) as Vec3) : null
			) as [Vec3, Vec3];

			this.viewPoints = points.map((p) => (p ? [p[0] / p[2], p[1] / p[2]] : null)) as [Vec2, Vec2];
		}
		return [...this.viewPoints];
	}

	getReal2d(): [Vec2, Vec2] {
		if (this.realPoints == null) {
			const points = this.rawPoints.map((p) =>
				p ? ((multiply(this.realTransform, p) as unknown) as Vec3) : null
			) as [Vec3, Vec3];

			this.realPoints = points.map((p) => (p ? [p[0] / p[2], p[1] / p[2]] : null)) as [Vec2, Vec2];
		}
		return [...this.realPoints];
	}

	getMidPoint(): Vec2 {
		const points = this.get2d();
		return points[0].map((x, i) => (x + points[1][i]) / 2) as Vec2;
	}

	getLength() {
		if (!this.isFull()) return 0;

		const p = this.getReal2d();
		const v = subtract(p[0], p[1]) as Vec2;
		return sqrt(dot(v, v));
	}

	setViewTransform(transform: Mat3) {
		this.viewPoints = null;
		this.viewTransform = transform;
	}

	setRealTransform(transform: Mat3) {
		this.realPoints = null;
		this.realTransform = transform;
	}
}
