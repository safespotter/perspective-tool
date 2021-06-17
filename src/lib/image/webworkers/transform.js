function applyTransform(point, transform) {
    const p = [...point, 1];
    const tP = transform.map((row) => row.reduce((acc, _, i) => acc + row[i] * p[i], 0));

    const transformedPoint = tP.map((n) => n / tP[tP.length - 1]).slice(0, -1);
    return transformedPoint;
}

function mapTransform(uvmap, transform) {
    return uvmap.map((p) => applyTransform(p, transform))
}

onmessage = (e) => {
    const [uvmap, transform] = e.data;
    postMessage(mapTransform(uvmap, transform));
};
