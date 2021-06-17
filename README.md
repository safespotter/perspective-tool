# Steps to go from world to camera to image

Using homogenous coordinates, so a 2d point has length 3 and a 3d point has length 4

1. Transform world coordinates to camera coordinates

   - Origin at camera position
   - Z axis is the normal of the image plane
   - X goes right, Y goes down

    <br>

```
    w is world
    c is camera
    tr is translation
    rot is rotation
    ^-1 is inverse
    PC is pitch
    YW is yaw
    RL is roll

    (rot(axis(w)->axis(c)) * tr(w->c))^-1

ROTATION w->c
|  cos(PC)cos(YW)cos(RL)-sin(PC)sin(RL); cos(PC)cos(YW)sin(RL)+sin(PC)cos(RL);-cos(PC)sin(YW);0 |
| -sin(PC)cos(YW)cos(RL)-cos(PC)sin(RL);-sin(PC)cos(YW)sin(RL)+cos(PC)cos(RL); sin(PC)sin(YW);0 |
|                        sin(YW)cos(RL);                       sin(YW)sin(RL);        cos(YW);0 |
|                                     0;                                    0;              0;1 |

*

TRANSLATION w->c
| 1 0 0 Xc |
| 0 1 0 Yc |
| 0 0 1 Zc |
| 0 0 0  1 |

^-1

-------------

w -> c
|  cos(PC)cos(YW)cos(RL)-sin(PC)sin(RL); cos(PC)cos(YW)sin(RL)+sin(PC)cos(RL);-cos(PC)sin(YW);Xc |
| -sin(PC)cos(YW)cos(RL)-cos(PC)sin(RL);-sin(PC)cos(YW)sin(RL)+cos(PC)cos(RL); sin(PC)sin(YW);Yc |
|                        sin(YW)cos(RL);                       sin(YW)sin(RL);        cos(YW);Zc |
|                                     0;                                    0;              0; 1 |

^-1
```

2. Transform camera coordinates to pixels

   - The distance from the camera to the image plane is F
   - Use euclidean point as input
   - Transform matrix is 3x3, so we are losing one dimension

   <br>

   ```
   c is camera coords, p is pixel coords

   O(x,y) is the center of the image
   f is the focal length is pixel width
   a is the aspect ratio (h/w)

   c -> p
   normalize c (divide for homogeneous coord) and only use real coords

   PROJECTION
   |f   0  Ox|
   |0 f*a  Oy|
   |0   0   1|

   normalize p

   ---------
   p -> c with fixed plane

   3 equations from PROJECTION(c->p)^-1
   1 equation from the plane (TRANSLATION(w->c) * Z0)

   ```
