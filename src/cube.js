function Vec(x, y, z) {
  var that = {};
  that.x = x;
  that.y = y;
  that.z = z;

  that.copy = function() {
    return Vec(that.x, that.y, that.z);
  };

  return that;
}

Vec.A = function(a, b) {
  return Vec(a.x+b.x, a.y+b.y, a.z+b.z);
};

Vec.V = function(a, b, c) {
  if (typeof(b) === 'undefined') {
    return Vec(a.x, a.y, a.z);
  }
  if (typeof(c) !== 'undefined') {
    return Vec(a, b, c);
  }
  return Vec(b.x-a.x, b.y-a.y, b.z-a.z);
};

Vec.AsV = function(a, s, v) {
  return Vec(a.x+s*v.x, a.y+s*v.y, a.z+s*v.z);
};

Vec.M = function(a, b) {
  return Vec(a.x*b.x, a.y*b.y, a.z*b.z);
};

Vec.d = function(a, b) {
  return a.x*b.x + a.y*b.y + a.z*b.z;
};

Vec.S = function(a, s) {
  return Vec(s*a.x, s*a.y, s*a.z);
};

Vec.L = function(a, s, b) {
  return Vec.AsV(a, s, Vec.V(a, b));
};

Vec.mag2 = function(v) {
  return Vec.d(v, v);
};

Vec.mag = function(v) {
  return Math.sqrt(Vec.mag2(v));
};

Vec.U = function(v) {
  var m = Vec.mag2(v);
  if (m == 0) return v.copy();
  return Vec.S(v, 1.0 / Vec.mag(v));
};

Vec.X = function(a, b) {
  // |  i   j   k  |
  // | a.x a.y a.z |
  // | b.x b.y b.z |
  return Vec((a.y*b.z - a.z*b.y),
            -(a.x*b.z - a.z*b.x),
             (a.x*b.y - a.y*b.x));
};

Vec.RIJa = function(v, I, J, a) {
  return Vec.do(function() {
    var i = d(v, I);
    var j = d(v, J);
    var K = U(X(I,J));
    var k = d(v, K);
    var m = Math.sqrt(i*i + j*j);
    var theta = Math.atan2(j, i) + a;
    return A(A(S(I, m*Math.cos(theta)),
               S(J, m*Math.sin(theta))),
             S(K, k));
  });
};

Vec.RNa = function(v, N, a) {
  return Vec.do(function() {
    var I = X(N, Axis.Z);
    if (mag2(I) == 0) I = X(N, Axis.Y);
    var J = X(N, I);
    I = U(I);
    J = U(J);
    return RIJa(v, I, J, a);
  });
};

Vec.do = function(func) {
  var BACKUP = {};
  Object.keys(Vec).forEach(function(key) {
    if (typeof(window[key]) !== 'undefined') {
      BACKUP[key] = window[key];
    }
    window[key] = Vec[key];
  });
  var result = func();
  Object.keys(Vec).forEach(function(key) {
    delete window[key];
  });
  Object.keys(BACKUP).forEach(function(key) {
    window[key] = BACKUP[key];
  });
  return result;
};

var Axis = {
  'X': Vec(1, 0, 0),
  'Y': Vec(0, 1, 0),
  'Z': Vec(0, 0, 1),
};

function Frame(O, I, J, K) {
  var that = {};
  that.O = O;
  that.I = I;
  that.J = J;
  that.K = K;

  that.toLocal = function(p) {
    return Vec.do(function() {
      var OP = V(that.O,p);
      return Vec(d(that.I, OP),
                 d(that.J, OP),
                 d(that.K, OP));
    });
  };

  that.toGlobal = function(p) {
    return Vec.do(function() {
      var pp = that.O.copy();
      pp = A(pp, S(that.I, p.x));
      pp = A(pp, S(that.J, p.y));
      pp = A(pp, S(that.K, p.z));
      return pp;
    });
  };

  return that;
};

function Basis(I, J, K) {
  var that = {};
  that.frame = Frame(Vec(0,0,0), I, J, K);
  that.toLocal = that.frame.toLocal;
  that.toGlobal = that.frame.toGlobal;
  return that;
};

function Camera(frame, fov) {
  var that = {};
  that.frame = frame;
  that.fov = fov;

  that.view = function(p) {
    return that.frame.toLocal(p);
  };

  /** Project to homogenous coordinates. */
  that.project = function(p) {
    var k = 2.0 * Math.tan(that.fov/2 * Math.PI / 180.0);
    var w = 2.0;
    return Vec.S(p, w/(k*p.z))
  };

  that.screen = function(p, width, height) {
    return Vec.do(function() {
      return A(M(S(A(p, Vec(1,1,0)), 0.5), V(width, -height, 1.0)), V(0, height, 0));
    });
  };

  that.mvps = function(p, width, height) {
    return that.screen(that.project(that.view(p)), width, height);
  };

  return that;
};

var G = function(g, width, height) {
  g.camera = null;
  g.width = width;
  g.height = height;

  g.edge = function(a, b) {
    if (g.camera != null) {
      a = g.camera.mvps(a, g.width, g.height);
      b = g.camera.mvps(b, g.width, g.height);
    }
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.closePath();
  };

  return g;
};
