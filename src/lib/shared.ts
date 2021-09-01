export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export type Mat3 = [Vec3, Vec3, Vec3];
export type Mat4 = [Vec4, Vec4, Vec4, Vec4];
export type Mat3x4 = [Vec4, Vec4, Vec4];
export type Mat4x3 = [Vec3, Vec3, Vec3, Vec3];

export type Camera = {
	height: number;
	focal: number;
	pitch: number;
	yaw: number;
	roll: number;
};

export type Navigation = {
	x: number;
	y: number;
	zoom: number;
};
