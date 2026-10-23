System.register("chunks:///_virtual/main", ['./StreetCollision.ts', './Tavern.ts', './TavernBakedLight.ts'], function () {
  return {
    setters: [null, null, null],
    execute: function () {}
  };
});

System.register("chunks:///_virtual/StreetCollision.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports({
        canFit: canFit,
        canOccupy: canOccupy,
        moveBody: moveBody,
        moveCircle: moveCircle,
        obstacleDistance: obstacleDistance
      });
      cclegacy._RF.push({}, "f6b02AeOJNBSqzotRV2gmog", "StreetCollision", undefined);
      function obstacleDistance(x, z, b) {
        if (b.polygon) {
          var inside = false,
            best = Infinity;
          var p = b.polygon;
          for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
            var _p$j = p[j],
              ax = _p$j[0],
              az = _p$j[1],
              _p$i = p[i],
              bx = _p$i[0],
              bz = _p$i[1];
            if (az > z !== bz > z && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
            var _dx = bx - ax,
              _dz = bz - az,
              t = Math.max(0, Math.min(1, ((x - ax) * _dx + (z - az) * _dz) / (_dx * _dx + _dz * _dz || 1)));
            best = Math.min(best, Math.hypot(x - ax - t * _dx, z - az - t * _dz));
          }
          return inside ? 0 : Math.max(0, best - (b.margin || 0));
        }
        var a = b.angle || 0,
          dx = x - b.x,
          dz = z - b.z,
          px = dx * Math.cos(a) + dz * Math.sin(a),
          pz = -dx * Math.sin(a) + dz * Math.cos(a);
        return Math.hypot(Math.max(0, Math.abs(px) - b.w / 2), Math.max(0, Math.abs(pz) - b.d / 2));
      }
      /** Body footprint: three circles along screen-x (a capsule), because the pixel sprite is wider than it is deep. */

      function canOccupy(x, z, radius, boxes) {
        return boxes.every(function (b) {
          var a = b.angle || 0,
            dx = x - b.x,
            dz = z - b.z,
            px = dx * Math.cos(a) + dz * Math.sin(a),
            pz = -dx * Math.sin(a) + dz * Math.cos(a);
          if (Math.hypot(Math.max(0, Math.abs(px) - b.w / 2), Math.max(0, Math.abs(pz) - b.d / 2)) >= radius) return true;
          return obstacleDistance(x, z, b) >= radius;
        });
      }
      function canFit(x, z, body, boxes) {
        return canOccupy(x, z, body.radius, boxes) && canOccupy(x - body.side, z, body.radius, boxes) && canOccupy(x + body.side, z, body.radius, boxes);
      }
      /** Substeps prevent tunneling; axis sliding lets the player follow wall boundaries. */
      function moveBody(pos, dx, dz, body, boxes) {
        var x = pos.x,
          z = pos.z;
        var steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (body.radius * .45)));
        for (var i = 0; i < steps; i++) {
          if (canFit(x + dx / steps, z, body, boxes)) x += dx / steps;
          if (canFit(x, z + dz / steps, body, boxes)) z += dz / steps;
        }
        return {
          x: x,
          z: z
        };
      }
      function moveCircle(pos, dx, dz, radius, boxes) {
        return moveBody(pos, dx, dz, {
          radius: radius,
          side: 0
        }, boxes);
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Tavern.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './StreetCollision.ts', './TavernBakedLight.ts'], function (exports) {
  var _applyDecoratedDescriptor, _inheritsLoose, _createForOfIteratorHelperLoose, _extends, _initializerDefineProperty, _assertThisInitialized, _asyncToGenerator, _regeneratorRuntime, cclegacy, _decorator, EffectAsset, Material, Color, Node, MeshRenderer, utils, gfx, primitives, Vec4, Vec3, Texture2D, instantiate, Component, resources, JsonAsset, Prefab, view, profiler, director, DirectionalLight, SpotLight, Camera, canFit, moveBody, canOccupy, TavernBakedLight;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _extends = module.extends;
      _initializerDefineProperty = module.initializerDefineProperty;
      _assertThisInitialized = module.assertThisInitialized;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      EffectAsset = module.EffectAsset;
      Material = module.Material;
      Color = module.Color;
      Node = module.Node;
      MeshRenderer = module.MeshRenderer;
      utils = module.utils;
      gfx = module.gfx;
      primitives = module.primitives;
      Vec4 = module.Vec4;
      Vec3 = module.Vec3;
      Texture2D = module.Texture2D;
      instantiate = module.instantiate;
      Component = module.Component;
      resources = module.resources;
      JsonAsset = module.JsonAsset;
      Prefab = module.Prefab;
      view = module.view;
      profiler = module.profiler;
      director = module.director;
      DirectionalLight = module.DirectionalLight;
      SpotLight = module.SpotLight;
      Camera = module.Camera;
    }, function (module) {
      canFit = module.canFit;
      moveBody = module.moveBody;
      canOccupy = module.canOccupy;
    }, function (module) {
      TavernBakedLight = module.TavernBakedLight;
    }],
    execute: function () {
      var _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2;
      cclegacy._RF.push({}, "23f47DOg1JInpUUYAwTSR/P", "Tavern", undefined);
      var ccclass = _decorator.ccclass,
        property = _decorator.property;
      // AGENTS.md 3.5.6: preserve the conservative capsule (lateral 0.44 m, depth 0.28 m); indoor walk 1.6 m/s.
      // v8 calibrates the visible actor down 10%; keep upright projection and shorten stride by the same ratio.
      var BODY = {
        radius: .28,
        side: .16
      };
      var WALK_SPEED = 2.1,
        ACCEL = 11,
        DECEL = 19,
        STRIDE_CYCLE = 1.575;
      var FIGURE_WIDTH = 1.285;
      var FIGURE_HEIGHT = FIGURE_WIDTH / Math.cos(50 * Math.PI / 180);
      var REACH_HEIGHT = 1.125; // Reach-obstruction ray follows the actor's 10% smaller upper body.
      function createFlameMesh() {
        var positions = [],
          indices = [],
          colors = [];
        for (var j = 0; j <= 16; j++) {
          var t = j / 16,
            r = Math.sin(Math.PI * t) * .43 * (1 - t * .65);
          for (var i = 0; i < 16; i++) {
            var a = i * Math.PI / 8;
            positions.push(Math.cos(a) * r + Math.sin(t * 4) * t * .13, t, Math.sin(a) * r);
            var core = Math.pow(Math.max(0, 1 - t), .55),
              side = .80 + .20 * Math.cos(a + .4);
            colors.push(1, (.28 + .66 * core) * side, .035 + .47 * Math.pow(core, 3), 1);
          }
        }
        for (var _j = 0; _j < 16; _j++) for (var _i = 0; _i < 16; _i++) {
          var _a = _j * 16 + _i,
            b = _j * 16 + (_i + 1) % 16;
          indices.push(_a, b, _a + 16, b, b + 16, _a + 16);
        }
        return utils.createMesh({
          positions: positions,
          indices: indices,
          colors: colors
        });
      }
      var Tavern = exports('Tavern', (_dec = ccclass('Tavern'), _dec2 = property(EffectAsset), _dec3 = property(EffectAsset), _dec(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Tavern, _Component);
        function Tavern() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _initializerDefineProperty(_this, "standardEffect", _descriptor, _assertThisInitialized(_this));
          _initializerDefineProperty(_this, "unlitEffect", _descriptor2, _assertThisInitialized(_this));
          _this.models = new Map();
          _this.rooms = [];
          _this.floor = 0;
          _this.stage = void 0;
          _this.things = [];
          _this.room = void 0;
          _this.sourceSurfaces = {};
          _this.surfaceEffect = null;
          _this.surfaces = new Map();
          _this.surfacePool = new Map();
          _this.camera = void 0;
          _this.sun = void 0;
          _this.lights = [];
          _this.fires = [];
          _this.elapsed = 0;
          _this.player = void 0;
          _this.figure = void 0;
          _this.actorMat = void 0;
          _this.atlas = void 0;
          _this.frameName = '';
          _this.facing = 'S';
          _this.distance = 0;
          _this.pos = {
            x: -6,
            z: 2.5
          };
          _this.locks = new Map();
          _this.passwordDialog = false;
          _this.motionStamp = 0;
          _this.drawnDistance = 0;
          _this.vel = {
            x: 0,
            z: 0
          };
          _this.keys = new Set();
          _this.pad = {
            x: 0,
            z: 0
          };
          _this.overview = true;
          _this.loaded = false;
          _this.carrying = null;
          _this.selected = '';
          _this.reviewFrame = null;
          _this.carryingLightTime = 0;
          _this.transitioning = false;
          _this.transitionPhase = 'idle';
          _this.fade = void 0;
          _this.cycle = void 0;
          _this.preferredTarget = '';
          _this.reviewKind = new URLSearchParams(location.search).get('review');
          _this.sofaReview = _this.reviewKind === 'sofa' || _this.reviewKind === 'model';
          _this.baked = null;
          _this.bakedSources = [];
          _this.enhancedLight = new URLSearchParams(location.search).get('lighting') !== 'baseline';
          _this.hud = void 0;
          _this.action = void 0;
          _this.status = void 0;
          _this.title = void 0;
          _this.note = void 0;
          _this.hint = '炉火已经点亮。走近家具，用 E 交互。';
          _this.cleanups = [];
          _this.stageAssets = [];
          _this.states = new Map();
          _this.glowMat = void 0;
          _this.mats = new Map();
          _this.boxMesh = utils.createMesh(primitives.box());
          _this.flameMesh = createFlameMesh();
          _this.sphereMesh = utils.createMesh(primitives.sphere(.5, {
            segments: 12
          }));
          return _this;
        }
        var _proto = Tavern.prototype;
        _proto.inside = function inside(r) {
          return !!r && this.pos.x > r[0] + .44 && this.pos.x < r[1] - .44 && this.pos.z > r[2] + .28 && this.pos.z < r[3] - .28;
        }
        /** Future key/permission gameplay calls this; only a closed, stationary door can lock. */;
        _proto.setDoorLocked = function setDoorLocked(id, locked) {
          var t = this.things.find(function (t) {
            return t.data.id === id;
          });
          if (!(t != null && t.data.lockable) || t.data.interactive !== 'door' || locked && (t.on || Math.abs(t.angle) > .01)) return false;
          this.locks.set(id, locked);
          return true;
        };
        _proto.start = /*#__PURE__*/function () {
          var _start = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            var _this2 = this;
            var globals, sunNode, i, n, l, cn, down, up, blur, _ref, _ref2, data, modelNames, sample, samples, id, _sample, completed;
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  view.enableRetina(true);
                  profiler.hideStats();
                  this.createHUD();
                  globals = director.getScene().globals;
                  globals.skybox.enabled = false;
                  globals.ambient.skyColor = new Vec4(.52, .48, .64, 1);
                  globals.ambient.skyIllum = this.enhancedLight && !this.sofaReview ? 10500 : 7500;
                  globals.ambient.groundAlbedo = new Vec4(.30, .19, .12, 1);
                  globals.shadows.enabled = true;
                  globals.shadows.type = 1;
                  globals.shadows.shadowMapSize = 2048;
                  globals.shadows.maxReceived = 3;
                  sunNode = new Node('Warm ceiling bounce with shadows');
                  this.node.addChild(sunNode);
                  sunNode.setPosition(0, 15, 5);
                  sunNode.setRotationFromEuler(-65, -25, 0);
                  this.sun = sunNode.addComponent(DirectionalLight);
                  this.sun.color = new Color(255, 206, 152);
                  this.sun.illuminance = this.enhancedLight && !this.sofaReview ? 38000 : 27000;
                  this.sun.shadowEnabled = true;
                  this.sun.shadowPcf = 2;
                  this.sun.shadowBias = .025;
                  this.sun.shadowNormalBias = .05;
                  this.sun.shadowDistance = 65;
                  this.sun.csmLevel = 1;
                  for (i = 0; i < 2; i++) {
                    n = new Node('Local amber light ' + i);
                    this.node.addChild(n);
                    n.setRotationFromEuler(-90, 0, 0);
                    l = n.addComponent(SpotLight);
                    l.color = new Color(255, 177, 82);
                    l.range = 6;
                    l.spotAngle = 130;
                    l.angleAttenuationStrength = .9;
                    l.luminousFlux = 550;
                    l.shadowEnabled = false;
                    this.lights.push(l);
                  }
                  cn = new Node('Fixed room camera');
                  this.node.addChild(cn);
                  this.camera = cn.addComponent(Camera);
                  this.camera.projection = Camera.ProjectionType.ORTHO;
                  this.camera.near = .1;
                  this.camera.far = 90;
                  this.camera.clearColor = new Color(20, 17, 25, 255);
                  this.camera.visibility = 0xffffffff;
                  this.glowMat = this.material('#ffb848', true);
                  down = function down(e) {
                    if (_this2.passwordDialog || e.target instanceof HTMLInputElement) return;
                    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
                      e.preventDefault();
                      if (_this2.transitioning) return;
                      _this2.advanceMotion();
                      if (e.code === 'Tab' && !_this2.keys.has(e.code)) _this2.cycleTarget();
                      if (e.code === 'KeyE' && !_this2.keys.has(e.code)) _this2.interact();
                      if (e.code === 'Space' && !_this2.keys.has(e.code)) _this2.toggleView();
                      if (e.code === 'KeyR') _this2.reset();
                      _this2.keys.add(e.code);
                    }
                  };
                  up = function up(e) {
                    _this2.advanceMotion();
                    _this2.keys["delete"](e.code);
                  };
                  blur = function blur() {
                    _this2.advanceMotion();
                    _this2.keys.clear();
                    _this2.pad = {
                      x: 0,
                      z: 0
                    };
                  };
                  window.addEventListener('keydown', down);
                  window.addEventListener('keyup', up);
                  window.addEventListener('blur', blur);
                  this.cleanups.push(function () {
                    window.removeEventListener('keydown', down);
                    window.removeEventListener('keyup', up);
                    window.removeEventListener('blur', blur);
                  });
                  _context2.prev = 42;
                  _context2.next = 45;
                  return new Promise(function (ok, no) {
                    return resources.load('layout', JsonAsset, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 45:
                  data = _context2.sent;
                  this.rooms = data.json.levels;
                  modelNames = Array.from(new Set((_ref = []).concat.apply(_ref, this.rooms.map(function (r) {
                    return r.items.map(function (i) {
                      return i.model;
                    });
                  }))));
                  _context2.next = 50;
                  return new Promise(function (ok, no) {
                    return resources.load('materials/tavern-surface', EffectAsset, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 50:
                  this.surfaceEffect = _context2.sent;
                  _context2.next = 53;
                  return new Promise(function (ok, no) {
                    return resources.load('surface-data', JsonAsset, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 53:
                  this.sourceSurfaces = _context2.sent.json;
                  if (!this.sofaReview) {
                    _context2.next = 60;
                    break;
                  }
                  _context2.next = 57;
                  return new Promise(function (ok, no) {
                    return resources.load('sofa-review', JsonAsset, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 57:
                  sample = _context2.sent;
                  this.rooms = JSON.parse(JSON.stringify(sample.json.levels));
                  if (new URLSearchParams(location.search).get('turn') === '0') {
                    this.rooms[0].items[0].rot = 0;
                    this.rooms[0].blocks[0].z *= -1;
                  }
                case 60:
                  if (!(this.reviewKind === 'model')) {
                    _context2.next = 70;
                    break;
                  }
                  _context2.next = 63;
                  return new Promise(function (ok, no) {
                    return resources.load('furniture-review', JsonAsset, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 63:
                  samples = _context2.sent;
                  modelNames = Array.from(new Set(samples.json.levels.flatMap(function (r) {
                    return r.items.map(function (i) {
                      return i.model;
                    });
                  })));
                  id = new URLSearchParams(location.search).get('model');
                  _sample = samples.json.levels.find(function (r) {
                    return r.id === id;
                  });
                  if (_sample) {
                    _context2.next = 69;
                    break;
                  }
                  throw Error('Unknown review model: ' + id);
                case 69:
                  this.rooms = [_extends({}, _sample, {
                    id: 'upper'
                  })];
                case 70:
                  modelNames = Array.from(new Set(modelNames.concat((_ref2 = []).concat.apply(_ref2, this.rooms.map(function (r) {
                    return r.items.map(function (i) {
                      return i.model;
                    });
                  })))));
                  completed = 0;
                  _context2.next = 74;
                  return Promise.all(modelNames.map( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(id) {
                    var prefab;
                    return _regeneratorRuntime().wrap(function _callee$(_context) {
                      while (1) switch (_context.prev = _context.next) {
                        case 0:
                          _context.next = 2;
                          return new Promise(function (ok, no) {
                            return resources.load('models/' + id + '/' + id, Prefab, function (e, a) {
                              return e ? no(e) : ok(a);
                            });
                          });
                        case 2:
                          prefab = _context.sent;
                          _this2.models.set(id, prefab);
                          _this2.status.textContent = '正在载入家具 ' + ++completed + ' / ' + modelNames.length;
                        case 5:
                        case "end":
                          return _context.stop();
                      }
                    }, _callee);
                  }))));
                case 74:
                  this.createActor();
                  _context2.next = 77;
                  return this.loadActor();
                case 77:
                  this.changeFloor('upper');
                  this.loaded = true;
                  window.__tavern = {
                    state: function state() {
                      return _this2.state();
                    },
                    visit: function visit(id) {
                      return _this2.changeFloor(id);
                    },
                    place: function place(x, z) {
                      if (canFit(x, z, BODY, _this2.blocks())) {
                        _this2.pos = {
                          x: x,
                          z: z
                        };
                        _this2.vel = {
                          x: 0,
                          z: 0
                        };
                        _this2.motionStamp = performance.now();
                        _this2.drawnDistance = _this2.distance;
                        return true;
                      }
                      return false;
                    },
                    fits: function fits(x, z) {
                      return canFit(x, z, BODY, _this2.blocks());
                    },
                    swingClear: function swingClear(id) {
                      var t = _this2.things.find(function (t) {
                        return t.data.id === id;
                      });
                      return !!t && _this2.swingClear(t);
                    },
                    focus: function focus() {
                      _this2.overview = false;
                    },
                    overview: function overview() {
                      _this2.overview = true;
                    },
                    interact: function interact() {
                      return _this2.interact();
                    },
                    objects: function objects() {
                      return _this2.things.map(function (t) {
                        var _t$parts;
                        return _extends({}, t.data, {
                          on: t.on,
                          angle: t.angle,
                          position: t.node.position,
                          progress: t.progress,
                          parts: (_t$parts = t.parts) == null ? void 0 : _t$parts.map(function (p) {
                            return {
                              name: p.node.name,
                              position: p.node.position,
                              rotation: p.node.eulerAngles,
                              scale: p.node.scale
                            };
                          })
                        });
                      });
                    },
                    items: function items() {
                      return _this2.room.items;
                    },
                    blocks: function blocks() {
                      return _this2.blocks();
                    },
                    camera: function camera() {
                      return {
                        position: _this2.camera.node.position,
                        orthoHeight: _this2.camera.orthoHeight
                      };
                    },
                    cycleTarget: function cycleTarget() {
                      return _this2.cycleTarget();
                    },
                    reviewFrame: function reviewFrame(x, z, height) {
                      _this2.reviewFrame = {
                        x: x,
                        z: z,
                        height: height
                      };
                      _this2.player.active = false;
                      _this2.updateCamera(1);
                    },
                    clearReviewFrame: function clearReviewFrame() {
                      _this2.reviewFrame = null;
                      _this2.player.active = true;
                    },
                    hideActor: function hideActor() {
                      _this2.player.active = false;
                    }
                  };
                  _context2.next = 87;
                  break;
                case 82:
                  _context2.prev = 82;
                  _context2.t0 = _context2["catch"](42);
                  console.error(_context2.t0);
                  this.hint = '场景载入失败，请刷新重试。';
                  this.note.textContent = this.hint;
                case 87:
                case "end":
                  return _context2.stop();
              }
            }, _callee2, this, [[42, 82]]);
          }));
          function start() {
            return _start.apply(this, arguments);
          }
          return start;
        }();
        _proto.material = function material(hex, unlit) {
          if (unlit === void 0) {
            unlit = false;
          }
          var key = hex + unlit;
          if (this.mats.has(key)) return this.mats.get(key);
          var m = new Material();
          m.initialize({
            effectAsset: unlit ? this.unlitEffect : this.standardEffect
          });
          m.setProperty('mainColor', new Color().fromHEX(hex));
          if (!unlit) {
            m.setProperty('roughness', .9);
            m.setProperty('metallic', 0);
          }
          this.mats.set(key, m);
          return m;
        };
        _proto.primitive = function primitive(parent, name, x, y, z, w, h, d, mat, round) {
          if (round === void 0) {
            round = false;
          }
          var n = new Node(name);
          parent.addChild(n);
          n.setPosition(x, y, z);
          n.setScale(w, h, d);
          var r = n.addComponent(MeshRenderer);
          r.mesh = round ? this.sphereMesh : this.boxMesh;
          r.setMaterial(mat, 0);
          r.shadowCastingMode = 0;
          return n;
        };
        _proto.descendants = function descendants(n) {
          var nodes = [];
          for (var _iterator = _createForOfIteratorHelperLoose(n.children), _step; !(_step = _iterator()).done;) {
            var c = _step.value;
            nodes.push.apply(nodes, [c].concat(this.descendants(c)));
          }
          return nodes;
        };
        _proto.surfaceMaterial = function surfaceMaterial(m, model) {
          var _this$sourceSurfaces$, _m$passes$;
          if (!this.surfaceEffect) return m;
          var cached = this.surfaces.get(m);
          if (cached) return cached;
          var name = m.name.toLowerCase(),
            kind = /oak|walnut|honey|darkwood|edgewood|wood/.test(name) ? 1 : /linen|cloth|velvet|flax|sage|wine|rust|plaid|pillow|fabric|thread|carpet/.test(name) ? 2 : /masonry|clay|stone/.test(name) ? 3 : /brass|copper|pewter|iron|gold/.test(name) ? 4 : 0;
          var source = (_this$sourceSurfaces$ = this.sourceSurfaces[model]) == null ? void 0 : _this$sourceSurfaces$[m.name],
            defines = _extends({}, (_m$passes$ = m.passes[0]) == null ? void 0 : _m$passes$.defines, {
              TAVERN_SURFACE: /selected warm oak/.test(name) ? 0 : kind
            });
          // UV1 presence varies between imported meshes; none of these source textures
          // use it. Keep the variant only when a source material actually requests UV1.
          if (source != null && source.signature) defines.HAS_SECOND_UV = !!source.usesSecondUv;
          var value = function value(key) {
            var _v$image;
            var v = m.getProperty(key);
            if (v instanceof Texture2D) return source != null && source.signature ? ['source-texture', key] : [((_v$image = v.image) == null ? void 0 : _v$image.uuid) || v.uuid, v.getSamplerInfo()];
            return v;
          };
          var parameters = ['mainColor', 'albedoScale', 'roughness', 'metallic', 'occlusion', 'emissive', 'emissiveScale', 'alphaThreshold', 'tilingOffset', 'normalMap', 'albedoMap', 'pbrMap', 'metallicRoughnessMap', 'occlusionMap', 'emissiveMap', 'mainTexture'].map(value);
          var states = m.passes.map(function (p) {
            return [p.blendState, p.depthStencilState, p.rasterizerState, p.phase];
          });
          var key = JSON.stringify([m.name, (source == null ? void 0 : source.signature) || source, Object.keys(defines).sort().map(function (k) {
            return [k, defines[k]];
          }), states, parameters]);
          var result = this.surfacePool.get(key);
          if (!result) {
            result = new Material();
            result.copy(m, {
              effectAsset: this.surfaceEffect,
              defines: defines
            });
            result.name = m.name;
            if (source) {
              result.setProperty('normalStrength', source.normalStrength);
              if (source.alpha < 1) {
                var _m$getProperty;
                var color = ((_m$getProperty = m.getProperty('mainColor')) == null ? void 0 : _m$getProperty.clone()) || new Color(255, 255, 255);
                color.a = Math.round(255 * source.alpha);
                result.setProperty('mainColor', color);
              }
            }
            if (kind === 4) {
              var metal = m.getProperty('metallic');
              if (typeof metal === 'number') result.setProperty('metallic', Math.min(metal, .58));
            }
            this.surfacePool.set(key, result);
          }
          this.surfaces.set(m, result);
          return result;
        };
        _proto.changeFloor = function changeFloor(id, arrival) {
          var _this$baked,
            _this$stage,
            _this3 = this,
            _this$baked2;
          var index = this.rooms.findIndex(function (r) {
            return r.id === id;
          });
          if (index < 0) return;
          if (this.carrying) {
            this.carrying.node.setPosition(this.carrying.home);
            this.carrying = null;
          }
          (_this$baked = this.baked) == null || _this$baked.destroy();
          this.baked = null;
          (_this$stage = this.stage) == null || _this$stage.destroy();
          this.stageAssets.forEach(function (a) {
            return a.destroy();
          });
          this.stageAssets = [];
          this.floor = index;
          this.room = this.rooms[index];
          this.stage = new Node(this.room.title);
          this.node.addChild(this.stage);
          this.things = [];
          this.fires = [];
          this.selected = '';
          this.preferredTarget = '';
          if (this.enhancedLight && !this.sofaReview) this.baked = new TavernBakedLight(this.room.blocks.filter(function (b) {
            return b.name === 'wall' && !b.low;
          }), this.stage, this.room.darkZones || []);
          var _loop = function _loop() {
            var _this3$states$get2, _item$defaultOn, _t$parts2;
            var item = _step2.value;
            var p = _this3.models.get(item.model);
            if (!p) throw Error('Missing model ' + item.model);
            var n = instantiate(p);
            _this3.stage.addChild(n);
            n.name = item.id + ' ' + item.model;
            n.setPosition(item.x, item.y, item.z);
            n.setRotationFromEuler(0, item.rot, 0);
            if (Array.isArray(item.scale)) n.setScale(item.scale[0], item.scale[1], item.scale[2]);else n.setScale(item.scale, item.scale, item.scale);
            var _loop3 = function _loop3() {
              var r = _step4.value;
              r.shadowCastingMode = item.model.startsWith('floor-') || item.model.startsWith('rug') ? 0 : 1;
              r.receiveShadow = /^(teacup|winecup|bottle|pot|dish|tray|food|book|deskprop)-v7-/.test(item.model) ? 0 : 1;
              r.sharedMaterials.forEach(function (m, index) {
                if (m) r.setMaterial(_this3.surfaceMaterial(m, item.model), index);
              });
            };
            for (var _iterator4 = _createForOfIteratorHelperLoose(n.getComponentsInChildren(MeshRenderer)), _step4; !(_step4 = _iterator4()).done;) {
              _loop3();
            }
            var t = {
              data: item,
              node: n,
              on: (_this3$states$get2 = _this3.states.get(item.id)) != null ? _this3$states$get2 : item.interactive === 'door' ? false : (_item$defaultOn = item.defaultOn) != null ? _item$defaultOn : true,
              angle: 0,
              pivots: _this3.descendants(n).filter(function (c) {
                return c.name.startsWith('DoorPivot') && !c.name.includes('Mesh');
              }),
              home: n.position.clone(),
              bulbs: [],
              glass: []
            };
            var wickAnchors = _this3.descendants(n).filter(function (c) {
                return c.name.startsWith('FlameAnchor');
              }),
              hasFlame = wickAnchors.length > 0 || item.flame && !item.model.startsWith('light-v7-');
            if (item.lamp) {
              var anchor = _this3.descendants(n).find(function (c) {
                return c.name.startsWith('LightAnchor');
              });
              if (!hasFlame) t.bulbs.push(_this3.primitive(anchor || n, 'Light source', 0, anchor ? 0 : .4, 0, .045, .08, .045, _this3.glowMat, true));
              // lantern glass / lamp shade is opaque in the mesh; swap it for a warm unlit glow while the lamp is on so a lit lamp always reads as lit
              var _loop2 = function _loop2() {
                var r = _step5.value;
                r.sharedMaterials.forEach(function (m, i) {
                  if (m && /glass|linen/.test(m.name)) t.glass.push({
                    r: r,
                    i: i,
                    off: m
                  });
                });
              };
              for (var _iterator5 = _createForOfIteratorHelperLoose(n.getComponentsInChildren(MeshRenderer)), _step5; !(_step5 = _iterator5()).done;) {
                _loop2();
              }
              _this3.lampLook(t);
            }
            if (hasFlame) {
              for (var _iterator6 = _createForOfIteratorHelperLoose(wickAnchors.length ? wickAnchors : [n]), _step6; !(_step6 = _iterator6()).done;) {
                var a = _step6.value;
                var _f = _this3.primitive(a, 'Candle flame', 0, wickAnchors.length ? 0 : .49, 0, .045, .09, .045, _this3.flameMaterial());
                _f.getComponent(MeshRenderer).mesh = _this3.flameMesh;
                t.bulbs.push(_f);
              }
            }
            if (item.lamp) _this3.lampLook(t);
            if (item.lockable && !_this3.locks.has(item.id)) _this3.locks.set(item.id, !!item.locked);
            if (['window', 'bed', 'piano', 'storage'].indexOf(item.interactive || '') >= 0) {
              t.parts = _this3.descendants(n).filter(function (c) {
                return /^(WindowPivot|WindowTopPivot|BlindSlide|CurtainSlide|CoverPivot|PianoLidPivot|CabinetPivot|LidPivot|DrawerSlide)/.test(c.name) && !c.name.includes('Mesh');
              }).map(function (node) {
                return {
                  node: node,
                  position: node.position.clone(),
                  scale: node.scale.clone(),
                  rotation: node.eulerAngles.clone(),
                  bounds: node.getComponentsInChildren(MeshRenderer).filter(function (r) {
                    return r.mesh;
                  }).map(function (r) {
                    return {
                      node: r.node,
                      min: r.mesh.minPosition.clone(),
                      max: r.mesh.maxPosition.clone()
                    };
                  })
                };
              });
              t.progress = t.on ? 1 : 0;
              _this3.poseFurniture(t);
            }
            if (item.interactive || item.lamp) _this3.things.push(t);
            if (_this3.baked && !item.lamp && !item.flame) _this3.baked.add(n, ['door', 'cup'].indexOf(item.interactive || '') >= 0, (_t$parts2 = t.parts) == null ? void 0 : _t$parts2.map(function (p) {
              return p.node;
            }));
          };
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.room.items), _step2; !(_step2 = _iterator2()).done;) {
            _loop();
          }
          this.bakedSources = this.room.items.filter(function (i) {
            return i.lamp || i.flame || i.model.startsWith('window');
          }).map(function (i) {
            var _ref4, _this3$states$get, _p$x, _p$y, _p$z, _i$lightColor;
            var cold = i.model.startsWith('window'),
              r = i.rot * Math.PI / 180;
            var n = _this3.stage.children.find(function (n) {
                return n.name === i.id + ' ' + i.model;
              }),
              anchor = n && _this3.descendants(n).find(function (c) {
                return /^(LightAnchor|FlameAnchor)/.test(c.name);
              }),
              p = anchor == null ? void 0 : anchor.worldPosition,
              opened = (_ref4 = (_this3$states$get = _this3.states.get(i.id)) != null ? _this3$states$get : i.defaultOn) != null ? _ref4 : true,
              curtained = cold && !!n && _this3.descendants(n).some(function (c) {
                return /^(CurtainSlide|BlindSlide)/.test(c.name);
              });
            return {
              id: i.id,
              x: (_p$x = p == null ? void 0 : p.x) != null ? _p$x : i.x + Math.sin(r) * .3,
              y: (_p$y = p == null ? void 0 : p.y) != null ? _p$y : i.y + (cold ? 1 : .6),
              z: (_p$z = p == null ? void 0 : p.z) != null ? _p$z : i.z + Math.cos(r) * .3,
              range: cold ? 3.4 : i.flame ? 2.4 : 3.5,
              color: (_i$lightColor = i.lightColor) != null ? _i$lightColor : cold ? opened ? [.08, .35, 1.5] : [.04, .18, .75] : i.flame ? [2, 1.1, .22] : [3.2, 1.8, .5],
              on: opened || cold && !curtained
            };
          }).concat(this.room.fires.map(function (f, i) {
            return {
              id: 'fire-' + i,
              x: f.x,
              y: 1.05,
              z: f.z + .3,
              range: 5,
              color: [4, 1.8, .2],
              on: true
            };
          }));
          (_this$baked2 = this.baked) == null || _this$baked2.update(this.bakedSources);
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.room.fires), _step3; !(_step3 = _iterator3()).done;) {
            var f = _step3.value;
            for (var i = 0; i < 9; i++) {
              var n = this.primitive(this.stage, 'Living hearth flame', f.x + (i - 4) * .105, f.y - .23, f.z + i % 2 * .08, .28, .55 + i % 3 * .12, .22, this.flameMaterial());
              n.getComponent(MeshRenderer).mesh = this.flameMesh;
              this.fires.push(n);
            }
          }
          var bounds = this.room.bounds;
          this.primitive(this.stage, 'Solid foundation edge', (bounds[0] + bounds[1]) / 2, -.78, bounds[3], bounds[1] - bounds[0], 1.5, .24, this.material('#3b2418'));
          if (this.sofaReview) this.primitive(this.stage, 'Neutral timber-colour review floor', 0, -.055, 0, 10, .10, 9, this.material('#78502e'));
          this.contactShadows();
          this.pos = _extends({}, arrival || this.room.spawn);
          this.vel = {
            x: 0,
            z: 0
          };
          this.player.setPosition(this.pos.x, .03, this.pos.z);
          this.title.textContent = this.room.title;
          this.overview = false;
          this.hint = id === 'upper' ? '炉边起居室 · 北排与东翼是客房，西南楼梯通往一楼。' : '一楼前厅 · 吧台在左，说书厅有十五位玩家席与一位说书人席。';
          this.motionStamp = performance.now();
          this.drawnDistance = this.distance;
          this.updateCamera(1);
        };
        _proto.contactShadows = function contactShadows() {
          var _this4 = this;
          var positions = [],
            colors = [],
            indices = [];
          var _loop4 = function _loop4() {
            var b = _step7.value;
            if (b.name === 'wall' || b.name.indexOf('stair') >= 0 || !_this4.room.items.find(function (i) {
              return i.id === b.name;
            })) return 1; // continue
            var base = positions.length / 3;
            var rings = 4,
              segments = 24;
            for (var ring = 0; ring <= rings; ring++) {
              var radius = .1 + ring / rings * .9;
              for (var i = 0; i <= segments; i++) {
                var a = i * Math.PI * 2 / segments;
                var ex = Math.cos(a) * b.w * .62 * radius,
                  ez = Math.sin(a) * b.d * .72 * radius,
                  ba = b.angle || 0;
                positions.push(b.x + ex * Math.cos(ba) - ez * Math.sin(ba), .046, b.z + ex * Math.sin(ba) + ez * Math.cos(ba));
                colors.push(.11, .07, .09, (1 - radius) * (1 - radius) * .46);
              }
            }
            for (var j = 0; j < rings; j++) for (var _i2 = 0; _i2 < segments; _i2++) {
              var _a2 = base + j * (segments + 1) + _i2;
              indices.push(_a2, _a2 + segments + 1, _a2 + 1, _a2 + 1, _a2 + segments + 1, _a2 + segments + 2);
            }
          };
          for (var _iterator7 = _createForOfIteratorHelperLoose(this.room.blocks), _step7; !(_step7 = _iterator7()).done;) {
            if (_loop4()) continue;
          }
          var n = new Node('Soft furniture contact occlusion');
          this.stage.addChild(n);
          var r = n.addComponent(MeshRenderer);
          r.mesh = utils.createMesh({
            positions: positions,
            colors: colors,
            indices: indices
          });
          var m = new Material();
          m.initialize({
            effectAsset: this.unlitEffect,
            technique: 1,
            defines: {
              USE_VERTEX_COLOR: true
            },
            states: {
              rasterizerState: {
                cullMode: gfx.CullMode.NONE
              }
            }
          });
          m.setProperty('mainColor', Color.WHITE);
          r.setMaterial(m, 0);
          r.shadowCastingMode = 0;
          this.stageAssets.push(r.mesh, m);
        };
        _proto.createActor = function createActor() {
          this.player = new Node('Baiyang');
          this.node.addChild(this.player);
          this.figure = new Node('Pixel figure');
          this.player.addChild(this.figure);
          this.figure.setRotationFromEuler(0, 0, 0);
          this.figure.setScale(FIGURE_WIDTH, FIGURE_HEIGHT, 1);
          var r = this.figure.addComponent(MeshRenderer);
          r.mesh = utils.createMesh(primitives.quad());
          this.actorMat = new Material();
          this.actorMat.initialize({
            effectAsset: this.unlitEffect,
            defines: {
              USE_TEXTURE: true,
              USE_ALPHA_TEST: true
            },
            states: {
              rasterizerState: {
                cullMode: gfx.CullMode.NONE
              }
            }
          });
          r.setMaterial(this.actorMat, 0);
          r.shadowCastingMode = 1;
          r.receiveShadow = 0;
          this.figure.active = false;
          this.primitive(this.player, 'Foot contact', 0, .006, .015, .306, .016, .216, this.material('#302021'), true);
        };
        _proto.loadActor = /*#__PURE__*/function () {
          var _loadActor = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
            var texture, atlas;
            return _regeneratorRuntime().wrap(function _callee3$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  _context3.next = 2;
                  return new Promise(function (ok, no) {
                    return resources.load('guard/guard/texture', Texture2D, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 2:
                  texture = _context3.sent;
                  texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
                  this.actorMat.setProperty('mainTexture', texture);
                  _context3.next = 7;
                  return new Promise(function (ok, no) {
                    return resources.load('guard/atlas', JsonAsset, function (e, a) {
                      return e ? no(e) : ok(a);
                    });
                  });
                case 7:
                  atlas = _context3.sent;
                  this.atlas = atlas.json;
                  this.figure.active = true;
                  this.drawFrame(0, false);
                case 11:
                case "end":
                  return _context3.stop();
              }
            }, _callee3, this);
          }));
          function loadActor() {
            return _loadActor.apply(this, arguments);
          }
          return loadActor;
        }();
        _proto.drawFrame = function drawFrame(frame, moving) {
          var _this$atlas$clips;
          if (!this.atlas) return;
          var key = moving ? this.facing + "/walk/" + frame : (_this$atlas$clips = this.atlas.clips["idle-" + this.facing]) == null ? void 0 : _this$atlas$clips[frame];
          if (!key || key === this.frameName) return;
          var f = this.atlas.frames[key];
          if (!f) return;
          var _f$frame = f.frame,
            x = _f$frame[0],
            y = _f$frame[1],
            w = _f$frame[2],
            h = _f$frame[3],
            _this$atlas$size = this.atlas.size,
            sw = _this$atlas$size[0],
            sh = _this$atlas$size[1];
          this.actorMat.setProperty('tilingOffset', new Vec4(w / sw, -h / sh, x / sw, (y + h) / sh));
          var offset = new Vec3((48 - f.root[0]) * FIGURE_WIDTH / 96, (f.root[1] - 48) * FIGURE_HEIGHT / 96, 0);
          Vec3.transformQuat(offset, offset, this.figure.rotation);
          this.figure.setPosition(offset);
          this.frameName = key;
        };
        _proto.doorLeaves = function doorLeaves(t, angle) {
          if (angle === void 0) {
            angle = t.angle;
          }
          var w = t.data.width || 1,
            len = t.pivots.length > 1 ? w / 2 : w;
          return t.pivots.map(function (p) {
            var side = p.name.includes('_-1') ? -1 : 1;
            var yaw = (t.data.rot + (side < 0 ? -angle : angle)) * Math.PI / 180,
              c = p.worldPosition;
            return {
              name: t.data.id + '-leaf',
              x: c.x + Math.cos(yaw) * len / 2 * -side,
              z: c.z - Math.sin(yaw) * len / 2 * -side,
              w: len + .025,
              d: .15,
              angle: -yaw
            };
          });
        }
        /** True when the body is outside every leaf position of the full 0–90° swing. */;
        _proto.swingClear = function swingClear(t) {
          for (var a = 0; a <= 90; a += 10) if (!canFit(this.pos.x, this.pos.z, BODY, this.doorLeaves(t, a))) return false;
          return true;
        };
        _proto.blocks = function blocks() {
          var _this$room;
          var out = ((_this$room = this.room) == null ? void 0 : _this$room.blocks.slice()) || [];
          for (var _iterator8 = _createForOfIteratorHelperLoose(this.things), _step8; !(_step8 = _iterator8()).done;) {
            var _t = _step8.value;
            if (_t.data.interactive === 'door') out.push.apply(out, this.doorLeaves(_t));
            if (_t.data.interactive === 'storage' && (_t.progress || 0) > .001) out.push.apply(out, this.movingFurnitureBlocks(_t));
          }
          return out;
        };
        _proto.movingFurnitureBlocks = function movingFurnitureBlocks(t) {
          var result = [];
          var _loop5 = function _loop5() {
            var part = _step9.value;
            var points = [];
            for (var _iterator10 = _createForOfIteratorHelperLoose(part.bounds || []), _step10; !(_step10 = _iterator10()).done;) {
              var _b = _step10.value;
              var all = [];
              for (var _i3 = 0, _arr = [_b.min.x, _b.max.x]; _i3 < _arr.length; _i3++) {
                var x = _arr[_i3];
                for (var _i4 = 0, _arr2 = [_b.min.y, _b.max.y]; _i4 < _arr2.length; _i4++) {
                  var y = _arr2[_i4];
                  for (var _i5 = 0, _arr3 = [_b.min.z, _b.max.z]; _i5 < _arr3.length; _i5++) {
                    var z = _arr3[_i5];
                    all.push(Vec3.transformMat4(new Vec3(), new Vec3(x, y, z), _b.node.worldMatrix));
                  }
                }
              }
              if (Math.min.apply(Math, all.map(function (v) {
                return v.y;
              })) > 1.15) continue;
              for (var _i6 = 0, _all = all; _i6 < _all.length; _i6++) {
                var v = _all[_i6];
                points.push([v.x, v.z]);
              }
            }
            if (!points.length) return 1; // continue
            points.sort(function (a, b) {
              return a[0] - b[0] || a[1] - b[1];
            });
            var cross = function cross(a, b, c) {
              return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
            };
            var half = function half(p) {
              var h = [];
              for (var _iterator11 = _createForOfIteratorHelperLoose(p), _step11; !(_step11 = _iterator11()).done;) {
                var v = _step11.value;
                while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], v) <= 0) h.pop();
                h.push(v);
              }
              return h;
            };
            var polygon = half(points).slice(0, -1).concat(half(points.slice().reverse()).slice(0, -1));
            var xs = points.map(function (v) {
                return v[0];
              }),
              zs = points.map(function (v) {
                return v[1];
              }),
              a = Math.min.apply(Math, xs),
              b = Math.max.apply(Math, xs),
              c = Math.min.apply(Math, zs),
              d = Math.max.apply(Math, zs);
            result.push({
              name: t.data.id + '-moving',
              x: (a + b) / 2,
              z: (c + d) / 2,
              w: b - a,
              d: d - c,
              polygon: polygon,
              margin: .015
            });
          };
          for (var _iterator9 = _createForOfIteratorHelperLoose(t.parts || []), _step9; !(_step9 = _iterator9()).done;) {
            if (_loop5()) continue;
          }
          return result;
        };
        _proto.nearby = function nearby() {
          var _this5 = this;
          if (this.carrying) return [this.carrying];
          var choices = [];
          var _loop6 = function _loop6() {
              var _t$data$interactX, _t$data$interactZ, _this5$bakedSources$f, _this5$bakedSources$f2;
              var t = _step12.value;
              if (!t.data.interactive || t.data.insideOnly && !_this5.inside(t.data.insideOnly)) return 0; // continue
              var tx = (_t$data$interactX = t.data.interactX) != null ? _t$data$interactX : t.data.x,
                tz = (_t$data$interactZ = t.data.interactZ) != null ? _t$data$interactZ : t.data.z;
              var d = Math.hypot(tx - _this5.pos.x, tz - _this5.pos.z);
              if (d >= 1.65) return 0; // continue
              // Stop prompts through walls; target furniture and its door leaf are allowed at endpoint.
              var blockers = _this5.blocks().filter(function (b) {
                return b.name !== t.data.id && !b.name.startsWith(t.data.id + '-') && (b.name === 'wall' || !(Math.abs(tx - b.x) < b.w / 2 + .05 && Math.abs(tz - b.z) < b.d / 2 + .05));
              });
              var targetY = t.data.lamp ? (_this5$bakedSources$f = (_this5$bakedSources$f2 = _this5.bakedSources.find(function (s) {
                return s.id === t.data.id;
              })) == null ? void 0 : _this5$bakedSources$f2.y) != null ? _this5$bakedSources$f : t.data.y + .4 : t.data.interactive === 'window' ? t.data.y + .55 : t.data.y + (t.data.interactive === 'storage' ? .70 : t.data.interactive === 'door' ? 1 : .12);
              var clear = true;
              var _loop7 = function _loop7() {
                var p = i / 8;
                var x = _this5.pos.x + (tx - _this5.pos.x) * p,
                  z = _this5.pos.z + (tz - _this5.pos.z) * p;
                // A low luggage chest can block walking without blocking a reach to the
                // lamp above it. Tall cabinets and walls still obstruct that reach.
                var atHeight = blockers.filter(function (b) {
                  var _b$height;
                  return ((_b$height = b.height) != null ? _b$height : 3) > REACH_HEIGHT + (targetY - REACH_HEIGHT) * p - .04;
                });
                if (!canOccupy(x, z, .05, atHeight)) {
                  clear = false;
                  return 1; // break
                }
              };

              for (var i = 1; i < 8; i++) {
                if (_loop7()) break;
              }
              if (clear) choices.push({
                t: t,
                distance: d
              });
            },
            _ret;
          for (var _iterator12 = _createForOfIteratorHelperLoose(this.things), _step12; !(_step12 = _iterator12()).done;) {
            _ret = _loop6();
            if (_ret === 0) continue;
          }
          return choices.sort(function (a, b) {
            return a.distance - b.distance;
          }).map(function (c) {
            return c.t;
          });
        };
        _proto.nearest = function nearest() {
          var _this6 = this;
          var choices = this.nearby();
          return choices.find(function (t) {
            return t.data.id === _this6.preferredTarget;
          }) || choices[0] || null;
        };
        _proto.cycleTarget = function cycleTarget() {
          var _this7 = this;
          var choices = this.nearby();
          if (choices.length < 2) return;
          var at = choices.findIndex(function (t) {
            return t === _this7.nearest();
          });
          this.preferredTarget = choices[(at + 1) % choices.length].data.id;
        };
        _proto.interact = function interact() {
          if (!this.loaded || this.transitioning || this.passwordDialog) return;
          var t = this.nearest();
          if (!t) {
            this.hint = '走近门、灯、杯子、书本或座位后交互。';
            return;
          }
          var d = t.data;
          if (d.interactive === 'door') {
            if (this.locks.get(d.id) && !this.inside(d.roomRect)) {
              if (d.password) this.askPassword(t);else this.hint = '房门已上锁。';
              return;
            }
            if (!this.swingClear(t)) {
              this.hint = '稍退一步，留出门扇转动的空间。';
              return;
            }
            t.on = !t.on;
            this.states.set(d.id, t.on);
            if (!t.on && d.password && !this.inside(d.roomRect)) this.locks.set(d.id, true);
            this.hint = d.label + (t.on ? '已打开。' : '已关闭。');
            if (d.model === 'door-street' && t.on) this.hint = '街门已打开；本次搭建范围为酒馆内部。';
          } else if (d.interactive === 'lamp') {
            t.on = !t.on;
            this.states.set(d.id, t.on);
            this.lampLook(t);
            var source = this.bakedSources.find(function (s) {
              return s.id === d.id;
            });
            if (source) {
              var _this$baked3;
              source.on = t.on;
              (_this$baked3 = this.baked) == null || _this$baked3.update(this.bakedSources, source);
            }
            this.hint = d.label + (t.on ? '已点亮。' : '已熄灭，附近受光随之减弱。');
          } else if (d.interactive === 'cup') {
            if (this.carrying === t) {
              var _this$baked4;
              this.moveCarriedAssembly(t.home);
              (_this$baked4 = this.baked) == null || _this$baked4.refreshMoving(this.bakedSources, new Set(this.carriedAssembly().map(function (x) {
                return x.node;
              })));
              this.carrying = null;
              this.hint = (d.label || '物件') + '已放回原处。';
            } else if (this.carrying) {
              this.hint = '先把手里的物件放回原处。';
            } else {
              this.carrying = t;
              this.hint = '已拿起' + (d.label || '物件') + '，再次交互放回。';
            }
          } else if (['window', 'bed', 'piano', 'storage'].indexOf(d.interactive || '') >= 0) {
            var _t$parts3;
            if (d.interactive === 'storage' && !((_t$parts3 = t.parts) != null && _t$parts3.length)) {
              this.showNote(d.label || '收纳物件', '已查看收纳物件；未提供的故事内容暂不展开。');
              return;
            }
            t.on = !t.on;
            this.states.set(d.id, t.on);
            this.selected = d.id;
            if (d.interactive === 'window') {
              var _source = this.bakedSources.find(function (s) {
                return s.id === d.id;
              });
              if (_source) {
                var _t$parts4, _this$baked5;
                var curtained = (_t$parts4 = t.parts) == null ? void 0 : _t$parts4.some(function (p) {
                  return /CurtainSlide|BlindSlide/.test(p.node.name);
                });
                _source.on = t.on || !curtained;
                _source.color = t.on ? [.08, .35, 1.5] : [.04, .18, .75];
                (_this$baked5 = this.baked) == null || _this$baked5.update(this.bakedSources, _source);
              }
              this.hint = t.on ? '窗扇已向外打开。' : '窗扇已合上；有帘子的窗户同时收拢窗帘。';
            } else if (d.interactive === 'bed') this.hint = t.on ? '被子已掀开；坐点、躺点已预留，人物暂时保持站立。' : '被子已铺回。';else if (d.interactive === 'piano') this.hint = t.on ? '琴盖已打开，可以看到琴键。人物演奏动作后续接入。' : '琴盖已合上。';else this.hint = t.on ? '柜门／箱盖已打开。' : '柜门／箱盖已关闭。';
          } else if (d.interactive === 'read') {
            this.hint = d.text || d.label || '';
            this.showNote(d.label || '', this.hint);
          } else if (d.interactive === 'seat') {
            this.selected = d.id;
            this.hint = "\u5DF2\u9009\u62E9" + d.label + "\u3002\u5750\u4E0B\uFF0F\u8D77\u8EAB\u4EBA\u7269\u52A8\u4F5C\u5C1A\u5F85\u5236\u4F5C\u3002";
            this.showNote(d.label || '座位', '座位已选中，可查看周围空间。\n当前人物尚无坐下／起身动画，本版保留站姿。');
          }
        };
        _proto.carriedAssembly = function carriedAssembly() {
          if (!this.carrying) return [];
          var ids = new Set([this.carrying.data.id]);
          for (var i = 0; i < 4; i++) {
            for (var _iterator13 = _createForOfIteratorHelperLoose(this.things), _step13; !(_step13 = _iterator13()).done;) {
              var _t2 = _step13.value;
              if (_t2.data.host && ids.has(_t2.data.host)) ids.add(_t2.data.id);
            }
          }
          return this.things.filter(function (t) {
            return ids.has(t.data.id);
          });
        };
        _proto.moveCarriedAssembly = function moveCarriedAssembly(position) {
          if (!this.carrying) return;
          var offset = Vec3.subtract(new Vec3(), position, this.carrying.home);
          for (var _iterator14 = _createForOfIteratorHelperLoose(this.carriedAssembly()), _step14; !(_step14 = _iterator14()).done;) {
            var _t3 = _step14.value;
            _t3.node.setPosition(Vec3.add(new Vec3(), _t3.home, offset));
          }
        };
        _proto.poseFurniture = function poseFurniture(t) {
          var p = t.progress || 0;
          for (var _iterator15 = _createForOfIteratorHelperLoose(t.parts || []), _step15; !(_step15 = _iterator15()).done;) {
            var part = _step15.value;
            var n = part.node,
              name = n.name;
            n.setPosition(part.position);
            n.setScale(part.scale);
            n.setRotationFromEuler(part.rotation);
            if (name.startsWith('WindowPivot')) n.setRotationFromEuler(part.rotation.x, part.rotation.y + (name.includes('_-1') ? 75 : -75) * p, part.rotation.z);else if (name.startsWith('WindowTopPivot')) n.setRotationFromEuler(part.rotation.x + 55 * p, part.rotation.y, part.rotation.z);else if (name.startsWith('BlindSlide')) {
              n.setScale(part.scale.x, part.scale.y * (1 + (1 - p) * 2.6), part.scale.z);
            } else if (name.startsWith('CurtainSlide')) {
              var s = name.includes('_-1') ? -1 : 1;
              n.setPosition(part.position.x - s * (1 - p) * Math.abs(part.position.x) * .48, part.position.y, part.position.z);
              n.setScale(part.scale.x * (1 + (1 - p) * 2.3), part.scale.y, part.scale.z);
              for (var _iterator16 = _createForOfIteratorHelperLoose(n.children), _step16; !(_step16 = _iterator16()).done;) {
                var child = _step16.value;
                if (child.name.startsWith('CurtainOpen')) child.active = t.on;else if (child.name.startsWith('CurtainClosed')) child.active = !t.on;else if (child.name.startsWith('CurtainTie')) child.active = t.on && p > .9;
              }
            } else if (name.startsWith('CoverPivot')) {
              n.setScale(part.scale.x, part.scale.y, part.scale.z * (1 - .62 * p));
              n.setPosition(part.position.x, part.position.y + .025 * p, part.position.z);
            } else if (name.startsWith('PianoLidPivot') || name.startsWith('LidPivot')) n.setRotationFromEuler(part.rotation.x - 100 * p, part.rotation.y, part.rotation.z);else if (name.startsWith('DrawerSlide')) n.setPosition(part.position.x, part.position.y, part.position.z + .25 * p);else if (name.startsWith('CabinetPivot')) n.setRotationFromEuler(part.rotation.x, part.rotation.y + (name.includes('_-1') ? -90 : 90) * p, part.rotation.z);
          }
        };
        _proto.askPassword = function askPassword(t) {
          var _this8 = this;
          this.passwordDialog = true;
          this.keys.clear();
          this.pad = {
            x: 0,
            z: 0
          };
          this.vel = {
            x: 0,
            z: 0
          };
          var form = document.createElement('form');
          form.className = 'reading';
          form.innerHTML = '<h2>储物房门锁</h2><p>请输入密码</p><input aria-label="储物房密码" type="password" autocomplete="off" style="font:18px system-ui;width:100%;padding:12px"><p class="error"></p><button type="submit">开锁</button> <button type="button">取消</button>';
          this.hud.appendChild(form);
          var close = function close() {
            form.remove();
            _this8.passwordDialog = false;
            _this8.keys.clear();
            _this8.motionStamp = performance.now();
          };
          form.querySelector('button[type=button]').addEventListener('click', close);
          form.onsubmit = function (e) {
            e.preventDefault();
            var value = form.querySelector('input').value;
            if (value !== t.data.password) {
              form.querySelector('.error').textContent = '密码不正确。';
              return;
            }
            _this8.locks.set(t.data.id, false);
            close();
            _this8.hint = '门锁已打开，再次操作开门。';
          };
          form.querySelector('input').focus();
        };
        _proto.lampLook = function lampLook(t) {
          for (var _iterator17 = _createForOfIteratorHelperLoose(t.bulbs), _step17; !(_step17 = _iterator17()).done;) {
            var b = _step17.value;
            b.active = t.on;
          }
          for (var _iterator18 = _createForOfIteratorHelperLoose(t.glass), _step18; !(_step18 = _iterator18()).done;) {
            var g = _step18.value;
            var key = 'lit-' + g.off.uuid;
            var lit = this.mats.get(key);
            if (!lit) {
              lit = new Material();
              lit.copy(g.off);
              lit.setProperty('emissive', new Color(255, 169, 66));
              lit.setProperty('emissiveScale', new Vec3(.65, .65, .65));
              this.mats.set(key, lit);
            }
            g.r.setMaterial(t.on ? lit : g.off, g.i);
          }
        };
        _proto.flameMaterial = function flameMaterial() {
          var key = 'Amber flame vertex gradient';
          var m = this.mats.get(key);
          if (!m) {
            m = new Material();
            m.initialize({
              effectAsset: this.unlitEffect,
              defines: {
                USE_VERTEX_COLOR: true
              },
              states: {
                rasterizerState: {
                  cullMode: gfx.CullMode.NONE
                }
              }
            });
            m.setProperty('mainColor', Color.WHITE);
            this.mats.set(key, m);
          }
          return m;
        };
        _proto.travel = /*#__PURE__*/function () {
          var _travel = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(id, arrival) {
            var paint;
            return _regeneratorRuntime().wrap(function _callee4$(_context4) {
              while (1) switch (_context4.prev = _context4.next) {
                case 0:
                  if (!this.transitioning) {
                    _context4.next = 2;
                    break;
                  }
                  return _context4.abrupt("return");
                case 2:
                  this.transitioning = true;
                  this.transitionPhase = 'fade-out';
                  this.keys.clear();
                  this.pad = {
                    x: 0,
                    z: 0
                  };
                  this.vel = {
                    x: 0,
                    z: 0
                  };
                  this.fade.style.pointerEvents = 'auto';
                  paint = function paint() {
                    return new Promise(function (resolve) {
                      return requestAnimationFrame(function () {
                        return requestAnimationFrame(function () {
                          return resolve();
                        });
                      });
                    });
                  };
                  _context4.prev = 9;
                  _context4.next = 12;
                  return this.fade.animate([{
                    opacity: 0
                  }, {
                    opacity: 1
                  }], {
                    duration: 220,
                    fill: 'forwards'
                  }).finished;
                case 12:
                  this.fade.style.opacity = '1';
                  this.transitionPhase = 'black';
                  _context4.next = 16;
                  return paint();
                case 16:
                  this.changeFloor(id, arrival);
                  this.preferredTarget = '';
                  this.updateCamera(1);
                  _context4.next = 21;
                  return paint();
                case 21:
                  _context4.next = 23;
                  return new Promise(function (resolve) {
                    return setTimeout(resolve, 180);
                  });
                case 23:
                  this.transitionPhase = 'fade-in';
                  _context4.next = 26;
                  return this.fade.animate([{
                    opacity: 1
                  }, {
                    opacity: 0
                  }], {
                    duration: 280,
                    fill: 'forwards'
                  }).finished;
                case 26:
                  _context4.prev = 26;
                  this.fade.getAnimations().forEach(function (a) {
                    return a.cancel();
                  });
                  this.fade.style.opacity = '0';
                  this.fade.style.pointerEvents = 'none';
                  this.transitioning = false;
                  this.transitionPhase = 'idle';
                  this.motionStamp = performance.now();
                  return _context4.finish(26);
                case 34:
                case "end":
                  return _context4.stop();
              }
            }, _callee4, this, [[9,, 26, 34]]);
          }));
          function travel(_x2, _x3) {
            return _travel.apply(this, arguments);
          }
          return travel;
        }();
        _proto.showNote = function showNote(title, text) {
          var old = this.hud.querySelector('.reading');
          old == null || old.remove();
          var panel = document.createElement('div');
          panel.className = 'reading';
          var h = document.createElement('h2');
          h.textContent = title;
          var p = document.createElement('p');
          p.textContent = text;
          var b = document.createElement('button');
          b.textContent = '收起';
          b.onclick = function () {
            return panel.remove();
          };
          panel.append(h, p, b);
          this.hud.append(panel);
        };
        _proto.toggleView = function toggleView() {
          this.overview = !this.overview;
        };
        _proto.reset = function reset() {
          if (!this.room) return;
          this.pos = _extends({}, this.room.spawn);
          this.vel = {
            x: 0,
            z: 0
          };
          this.overview = false;
          this.keys.clear();
          this.pad = {
            x: 0,
            z: 0
          };
        };
        _proto.state = function state() {
          var _this$room2,
            _this$carrying,
            _this$room3,
            _this9 = this,
            _this$nearest,
            _this$baked6,
            _this$baked7,
            _this$baked8;
          return _extends({
            ready: this.loaded,
            transitioning: this.transitioning,
            transitionPhase: this.transitionPhase,
            nearby: this.nearby().map(function (t) {
              return t.data.id;
            }),
            floor: (_this$room2 = this.room) == null ? void 0 : _this$room2.id
          }, this.pos, {
            figureWidth: FIGURE_WIDTH,
            body: BODY,
            speed: Math.hypot(this.vel.x, this.vel.z),
            frame: this.frameName,
            facing: this.facing,
            overview: this.overview,
            carrying: ((_this$carrying = this.carrying) == null ? void 0 : _this$carrying.data.id) || null,
            selected: this.selected,
            modelCount: this.models.size,
            objects: (_this$room3 = this.room) == null ? void 0 : _this$room3.items.length,
            blocked: !canFit(this.pos.x, this.pos.z, BODY, this.blocks()),
            doors: this.things.filter(function (t) {
              return t.data.interactive === 'door';
            }).map(function (t) {
              var _this9$locks$get;
              return {
                id: t.data.id,
                open: t.on,
                angle: t.angle,
                locked: (_this9$locks$get = _this9.locks.get(t.data.id)) != null ? _this9$locks$get : false
              };
            }),
            lamps: this.things.filter(function (t) {
              return t.data.lamp;
            }).map(function (t) {
              return {
                id: t.data.id,
                on: t.on,
                bulbs: t.bulbs.map(function (b) {
                  return b.active;
                })
              };
            }),
            nearest: (_this$nearest = this.nearest()) == null ? void 0 : _this$nearest.data.id,
            bakedLight: {
              enabled: !!this.baked,
              meshes: ((_this$baked6 = this.baked) == null ? void 0 : _this$baked6.count) || 0,
              sourceMeshes: ((_this$baked7 = this.baked) == null ? void 0 : _this$baked7.sourceCount) || 0,
              signature: ((_this$baked8 = this.baked) == null ? void 0 : _this$baked8.signature) || 0,
              sources: this.bakedSources.map(function (s) {
                return {
                  id: s.id,
                  on: s.on
                };
              })
            },
            realtimeLightCount: 1 + this.lights.filter(function (l) {
              return l.enabled;
            }).length,
            lightPositions: this.lights.map(function (l) {
              return _extends({}, l.node.position, {
                enabled: l.enabled
              });
            })
          });
        };
        _proto.createHUD = function createHUD() {
          var _this10 = this;
          this.hud = document.createElement('div');
          this.hud.id = 'tavern-ui';
          this.hud.innerHTML = "<style>\n #tavern-ui{position:fixed;inset:0;z-index:20;pointer-events:none;color:#f1dfb9;font:14px/1.55 system-ui;user-select:none}#tavern-ui *{box-sizing:border-box}#tavern-ui .top{position:absolute;top:20px;left:24px;text-shadow:0 2px 8px #000}#tavern-ui .eyebrow{letter-spacing:4px;color:#b9a47e;font-size:11px}#tavern-ui h1{font:500 24px/1.3 Georgia,'Microsoft Yahei',serif;margin:5px 0}#tavern-ui .status{font-size:12px;color:#c1ae8d}#tavern-ui button{pointer-events:auto;cursor:pointer;background:#2b2119e8;color:#f1dfb9;border:1px solid #8d7049;border-radius:6px;padding:10px 14px;font:14px system-ui;touch-action:none;min-height:44px}#tavern-ui button:hover{background:#58432c}#tavern-ui button:disabled{opacity:.5}#tavern-ui .views{position:absolute;top:20px;right:22px;display:flex;gap:8px}#tavern-ui .bottom{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);text-align:center;max-width:58vw}#tavern-ui .note{margin:8px 0 0;padding:5px 10px;background:#211711c9;border-radius:4px;font-size:12px}#tavern-ui .pad{position:absolute;bottom:26px;left:24px;display:grid;grid-template-columns:44px 44px 44px;gap:5px}#tavern-ui .pad button{padding:0;background:#2b2119b0}#tavern-ui .help{position:absolute;right:24px;bottom:28px;font-size:12px;color:#b9a47e}#tavern-ui .reading{position:absolute;pointer-events:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,90vw);padding:28px;background:#eee0bf;color:#372b20;border:1px solid #b59a69;box-shadow:0 16px 80px #0009;border-radius:5px}#tavern-ui .reading p{white-space:pre-line;user-select:text}#tavern-ui .reading h2{font-size:20px;margin-top:0}\n @media(max-width:650px){#tavern-ui .top{top:14px;left:14px}#tavern-ui h1{font-size:18px}#tavern-ui .views{top:94px;right:14px;gap:4px}#tavern-ui .views button{font-size:12px;padding:8px}#tavern-ui .bottom{left:auto;right:12px;bottom:24px;transform:none;max-width:52vw}#tavern-ui .pad{left:14px;bottom:28px}#tavern-ui .help{display:none}#tavern-ui .note{font-size:11px}}\n </style><div class=\"top\"><div class=\"eyebrow\">BELVEDERE \xB7 \u8D1D\u5C14\u7EF4\u5FB7</div><h1>\u9152\u9986\u6B63\u5728\u70B9\u706F\u2026</h1><div class=\"status\">\u6B63\u5728\u8F7D\u5165\u5BB6\u5177\u4E0E\u623F\u95F4</div></div><div class=\"views\"><button id=\"view\">\u5168\u666F / \u8DDF\u968F</button><button id=\"reset\">\u56DE\u5230\u697C\u68AF\u65C1</button></div><div class=\"pad\"><span></span><button data-x=\"0\" data-z=\"-1\">\u2191</button><span></span><button data-x=\"-1\" data-z=\"0\">\u2190</button><button data-x=\"0\" data-z=\"1\">\u2193</button><button data-x=\"1\" data-z=\"0\">\u2192</button></div><div class=\"bottom\"><button id=\"cycle-target\" style=\"display:none\">\u5207\u6362\u9644\u8FD1\u7269\u4EF6 \xB7 Tab</button> <button id=\"action\" disabled>\u8D70\u8FD1\u7269\u4EF6 \xB7 E</button><p class=\"note\">\u6B63\u5728\u8F7D\u5165\u2026</p></div><div class=\"help\">WASD \u79FB\u52A8 \xB7 E \u4EA4\u4E92 \xB7 \u7A7A\u683C \u5168\u666F</div>";
          document.body.append(this.hud);
          this.fade = document.createElement('div');
          this.fade.id = 'floor-fade';
          this.fade.setAttribute('aria-hidden', 'true');
          this.fade.style.cssText = 'position:fixed;inset:0;z-index:100;background:#000;opacity:0;pointer-events:none';
          this.hud.append(this.fade);
          this.cycle = this.hud.querySelector('#cycle-target');
          this.cycle.onclick = function () {
            return _this10.cycleTarget();
          };
          this.title = this.hud.querySelector('h1');
          this.status = this.hud.querySelector('.status');
          this.note = this.hud.querySelector('.note');
          this.action = this.hud.querySelector('#action');
          this.action.onclick = function () {
            return _this10.interact();
          };
          this.hud.querySelector('#view').onclick = function () {
            return _this10.toggleView();
          };
          this.hud.querySelector('#reset').onclick = function () {
            return _this10.reset();
          };
          var _loop8 = function _loop8() {
            var b = _Array$from[_i7];
            b.onpointerdown = function (e) {
              e.preventDefault();
              b.setPointerCapture(e.pointerId);
              _this10.advanceMotion();
              if (!_this10.transitioning) _this10.pad = {
                x: +b.dataset.x,
                z: +b.dataset.z
              };
            };
            b.onpointerup = b.onpointercancel = b.onlostpointercapture = function () {
              _this10.advanceMotion();
              _this10.pad = {
                x: 0,
                z: 0
              };
            };
          };
          for (var _i7 = 0, _Array$from = Array.from(this.hud.querySelectorAll('[data-x]')); _i7 < _Array$from.length; _i7++) {
            _loop8();
          }
        };
        _proto.advanceMotion = function advanceMotion() {
          var _this11 = this;
          if (this.transitioning) {
            this.motionStamp = performance.now();
            return;
          }
          var now = performance.now();
          if (!this.loaded) {
            this.motionStamp = now;
            return;
          }
          var dt = Math.min(.5, Math.max(0, (now - this.motionStamp) / 1000));
          this.motionStamp = now;
          var dx = this.pad.x + (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0),
            dz = this.pad.z + (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
          var mag = Math.hypot(dx, dz);
          if (mag) {
            dx /= mag;
            dz /= mag;
          }
          // Advance elapsed time in small collision steps; low rendering FPS must not
          // halve walking/door speed, or skip a body's intermediate door sweep.
          var steps = Math.max(1, Math.ceil(dt / .025)),
            step = dt / steps;
          var moved = 0;
          for (var tick = 0; tick < steps; tick++) {
            for (var _iterator19 = _createForOfIteratorHelperLoose([['x', dx * WALK_SPEED], ['z', dz * WALK_SPEED]]), _step19; !(_step19 = _iterator19()).done;) {
              var _step19$value = _step19.value,
                k = _step19$value[0],
                goal = _step19$value[1];
              var v = this.vel[k],
                rate = Math.abs(goal) > Math.abs(v) && Math.sign(goal) !== -Math.sign(v) ? ACCEL : DECEL;
              this.vel[k] = v + Math.sign(goal - v) * Math.min(Math.abs(goal - v), rate * step);
            }
            var next = moveBody(this.pos, this.vel.x * step, this.vel.z * step, BODY, this.blocks());
            moved += Math.hypot(next.x - this.pos.x, next.z - this.pos.z);
            if (step > 0) {
              if (Math.abs(next.x - this.pos.x) < Math.abs(this.vel.x * step) * .5) this.vel.x = 0;
              if (Math.abs(next.z - this.pos.z) < Math.abs(this.vel.z * step) * .5) this.vel.z = 0;
            }
            this.pos = next;
            for (var _iterator20 = _createForOfIteratorHelperLoose(this.things), _step20; !(_step20 = _iterator20()).done;) {
              var _t4 = _step20.value;
              if (_t4.data.interactive === 'door') {
                var _goal = _t4.on ? 90 : 0;
                var remaining = Math.min(Math.abs(_goal - _t4.angle), step * 100);
                while (remaining > .00001) {
                  var advance = Math.min(1, remaining),
                    proposed = _t4.angle + Math.sign(_goal - _t4.angle) * advance;
                  if (!canFit(this.pos.x, this.pos.z, BODY, this.doorLeaves(_t4, proposed))) {
                    this.hint = '请让开门扇，门会继续转动。';
                    break;
                  }
                  _t4.angle = proposed;
                  remaining -= advance;
                }
                if (Math.abs(_goal - _t4.angle) < .00001) _t4.angle = _goal;
                for (var _iterator21 = _createForOfIteratorHelperLoose(_t4.pivots), _step21; !(_step21 = _iterator21()).done;) {
                  var p = _step21.value;
                  p.setRotationFromEuler(0, p.name.includes('_-1') ? -_t4.angle : _t4.angle, 0);
                }
              }
            }
            if (moved > .0001) {
              var stair = this.room.items.find(function (i) {
                return i.autoStairs && i.triggerRect && _this11.pos.x >= i.triggerRect[0] && _this11.pos.x <= i.triggerRect[1] && _this11.pos.z >= i.triggerRect[2] && _this11.pos.z <= i.triggerRect[3];
              });
              if (stair) {
                this.distance += moved;
                void this.travel(stair.to, stair.arrival);
                return;
              }
            }
          }
          this.distance += moved;
          if (mag) {
            var ax = Math.abs(dx),
              az = Math.abs(dz),
              horizontal = this.facing === 'E' || this.facing === 'W';
            var turn = horizontal ? az > ax * 1.25 : ax > az * 1.25; // 1.25 hysteresis: no flicker on diagonals
            if (turn ? ax > az : horizontal) this.facing = dx > 0 ? 'E' : 'W';else this.facing = dz > 0 ? 'S' : 'N';
          }
        };
        _proto.update = function update(dt) {
          var _this$baked9,
            _this12 = this,
            _t$parts5;
          if (!this.loaded) return;
          dt = Math.min(dt, .2);
          this.elapsed += dt;
          var settled = new Set();
          for (var _iterator22 = _createForOfIteratorHelperLoose(this.things), _step22; !(_step22 = _iterator22()).done;) {
            var _t5 = _step22.value;
            if (_t5.parts) {
              var goal = _t5.on ? 1 : 0,
                previous = _t5.progress || 0;
              if (previous === goal) continue;
              _t5.progress = previous + (goal - previous) * Math.min(1, dt * 7);
              if (Math.abs(goal - _t5.progress) < .001) {
                _t5.progress = goal;
                settled.add(_t5.node);
              }
              this.poseFurniture(_t5);
              if (_t5.data.interactive === 'storage' && !canFit(this.pos.x, this.pos.z, BODY, this.blocks())) {
                _t5.progress = previous;
                this.poseFurniture(_t5);
                settled["delete"](_t5.node);
                this.hint = '请给柜门和抽屉让出一点空间。';
              }
            }
          }
          if (settled.size) (_this$baked9 = this.baked) == null || _this$baked9.refreshMoving(this.bakedSources, settled);
          this.advanceMotion();
          var moved = this.distance - this.drawnDistance;
          this.drawnDistance = this.distance;
          // A delayed frame may include travel completed before key release. Draw the
          // current stopped pose once deceleration has ended, even in that first frame.
          this.drawFrame(Math.floor(this.distance / STRIDE_CYCLE * 8) % 8, moved > .0001 && Math.hypot(this.vel.x, this.vel.z) > .001);
          this.player.setPosition(this.pos.x, .03, this.pos.z);
          if (this.carrying) {
            this.moveCarriedAssembly(new Vec3(this.pos.x + .21, .78, this.pos.z + .11));
            if (this.elapsed - this.carryingLightTime > .35) {
              var _this$baked10;
              (_this$baked10 = this.baked) == null || _this$baked10.refreshMoving(this.bakedSources, new Set(this.carriedAssembly().map(function (t) {
                return t.node;
              })));
              this.carryingLightTime = this.elapsed;
            }
          }
          this.fires.forEach(function (n, i) {
            n.setScale(.25 + .03 * Math.sin(_this12.elapsed * 6 + i), .48 + .14 * Math.sin(_this12.elapsed * 6 + i * 2), .20);
          });
          var zone = (this.room.darkZones || []).find(function (r) {
            return _this12.inside(r);
          });
          var sameZone = function sameZone(s) {
            var r = (_this12.room.darkZones || []).find(function (r) {
              return s.x > r[0] && s.x < r[1] && s.z > r[2] && s.z < r[3];
            });
            return r === zone;
          };
          var sources = this.bakedSources.filter(sameZone);
          var lamps = sources.filter(function (s) {
            return _this12.things.some(function (t) {
              return t.data.id === s.id && t.data.lamp;
            });
          });
          lamps.sort(function (a, b) {
            return Math.hypot(a.x - _this12.pos.x, a.z - _this12.pos.z) - Math.hypot(b.x - _this12.pos.x, b.z - _this12.pos.z);
          });
          // Reserve the nearest fixture's slot even when off: switching one lamp off
          // must not suddenly promote another fixture to a brighter real-time light.
          var fires = sources.filter(function (s) {
            return s.id.startsWith('fire-');
          }).sort(function (a, b) {
            return Math.hypot(a.x - _this12.pos.x, a.z - _this12.pos.z) - Math.hypot(b.x - _this12.pos.x, b.z - _this12.pos.z);
          });
          var chosen = [fires[0] || lamps[1], lamps[0]];
          for (var i = 0; i < 2; i++) {
            var s = chosen[i];
            this.lights[i].enabled = !!(s != null && s.on);
            this.lights[i].luminousFlux = (i === 0 ? 650 * (.97 + .03 * Math.sin(this.elapsed * 5.3)) : 400) * (zone ? .10 : 1);
            if (s) {
              this.lights[i].color = zone ? new Color(190, 46, 32) : new Color(255, 177, 82);
              this.lights[i].node.setPosition(s.x, s.y + .15, s.z);
              if (i === 0) this.lights[i].node.lookAt(new Vec3(s.x, .05, s.z + 2));else this.lights[i].node.setRotationFromEuler(-90, 0, 0);
            }
          }
          var warmth = sources.filter(function (s) {
            return s.on;
          }).reduce(function (m, s) {
            return Math.max(m, Math.max(0, 1 - Math.hypot(s.x - _this12.pos.x, s.z - _this12.pos.z) / 5));
          }, 0);
          this.actorMat.setProperty('mainColor', zone ? new Color(65 + warmth * 150, 25 + warmth * 30, 30 + warmth * 25, 255) : new Color(194 + warmth * 45, 182 + warmth * 32, 181 + warmth * 8, 255));
          this.updateCamera(dt);
          this.cycle.style.display = this.nearby().length > 1 ? 'inline-block' : 'none';
          var t = this.nearest();
          this.action.disabled = !t;
          this.action.textContent = t ? "" + (t.data.interactive === 'door' ? t.on ? '关闭' : '打开' : t.data.interactive === 'lamp' ? t.on ? '熄灭' : '点亮' : t.data.interactive === 'cup' ? this.carrying === t ? '放回' : '拿取' : t.data.interactive === 'window' ? t.on ? '关上' : '打开' : t.data.interactive === 'bed' ? t.on ? '铺回' : '掀开' : t.data.interactive === 'piano' ? t.on ? '合上' : '打开' : t.data.interactive === 'storage' ? (_t$parts5 = t.parts) != null && _t$parts5.length ? t.on ? '关闭' : '打开' : '查看' : t.data.interactive === 'seat' ? '选择' : '查看') + t.data.label + " \xB7 E" : '走近物件 · E';
          this.note.textContent = this.hint;
          this.status.textContent = (this.overview ? '全景' : '随人物移动') + " \xB7 " + (this.carrying ? '手持' + this.carrying.data.label : '自由探索');
        };
        _proto.updateCamera = function updateCamera(dt) {
          if (!this.room) return;
          var aspect = Math.max(.3, window.innerWidth / window.innerHeight),
            b = this.room.bounds;
          var tx = this.pos.x,
            tz = this.pos.z,
            height = aspect < 1 ? 3.8 : 3.2;
          if (this.overview) {
            tx = this.room.center.x;
            tz = this.room.center.z - .6;
            height = Math.max((b[1] - b[0] + 2.4) / aspect / 2, (b[3] - b[2]) * .383 + 3.1);
          } else {
            var hw = height * aspect;
            tx = Math.max(b[0] + Math.min(hw, (b[1] - b[0]) / 2) - .3, Math.min(b[1] - Math.min(hw, (b[1] - b[0]) / 2) + .3, tx));
            tz = Math.max(b[2] + 2.2, Math.min(b[3] - 3, tz));
          }
          if (this.sofaReview) {
            var _f$targetZ;
            var f = this.room.framing;
            tx = (f == null ? void 0 : f.targetX) || 0;
            tz = (_f$targetZ = f == null ? void 0 : f.targetZ) != null ? _f$targetZ : -.32;
            height = this.overview ? 3.0 : f ? Math.max(f.height, f.halfWidth / aspect) : Math.max(1.35, 1.40 / aspect);
          }
          if (this.reviewFrame) {
            tx = this.reviewFrame.x;
            tz = this.reviewFrame.z;
            height = this.reviewFrame.height;
          }
          var y = 24,
            zOffset = 20.138;
          var desired = new Vec3(tx, y, tz + zOffset);
          var k = dt >= 1 ? 1 : 1 - Math.exp(-7 * dt);
          this.camera.node.setPosition(Vec3.lerp(new Vec3(), this.camera.node.position, desired, k));
          this.camera.node.setRotationFromEuler(-50, 0, 0);
          this.camera.orthoHeight = height;
        };
        _proto.onDestroy = function onDestroy() {
          var _this$baked11, _this$actorMat, _this$hud;
          (_this$baked11 = this.baked) == null || _this$baked11.destroy();
          this.stageAssets.forEach(function (a) {
            return a.destroy();
          });
          this.surfacePool.forEach(function (m) {
            return m.destroy();
          });
          this.mats.forEach(function (m) {
            return m.destroy();
          });
          (_this$actorMat = this.actorMat) == null || _this$actorMat.destroy();
          this.boxMesh.destroy();
          this.sphereMesh.destroy();
          this.flameMesh.destroy();
          this.cleanups.forEach(function (f) {
            return f();
          });
          (_this$hud = this.hud) == null || _this$hud.remove();
          delete window.__tavern;
        };
        return Tavern;
      }(Component), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "standardEffect", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "unlitEffect", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      })), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/TavernBakedLight.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _createForOfIteratorHelperLoose, _createClass, cclegacy, MeshRenderer, Node, Material, utils, Mat3, Vec3, gfx;
  return {
    setters: [function (module) {
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
      MeshRenderer = module.MeshRenderer;
      Node = module.Node;
      Material = module.Material;
      utils = module.utils;
      Mat3 = module.Mat3;
      Vec3 = module.Vec3;
      gfx = module.gfx;
    }],
    execute: function () {
      cclegacy._RF.push({}, "7ccdcL7XmJC+IQCLEsBNIlJ", "TavernBakedLight", undefined);
      /** Vertex diffuse light, evaluated only on load/toggle. Static geometry sharing
       * a material is drawn together; doors, carried cups and lamps stay independent. */
      var TavernBakedLight = exports('TavernBakedLight', /*#__PURE__*/function () {
        function TavernBakedLight(wallBlocks, parent, darkZones) {
          if (darkZones === void 0) {
            darkZones = [];
          }
          this.entries = [];
          this.batches = [];
          this.visibilityCache = new Map();
          this.wallBlocks = wallBlocks;
          this.parent = parent;
          this.darkZones = darkZones;
        }
        var _proto = TavernBakedLight.prototype;
        _proto.add = function add(root, wholeObjectMoves, movingParts) {
          var _this = this;
          if (wholeObjectMoves === void 0) {
            wholeObjectMoves = false;
          }
          if (movingParts === void 0) {
            movingParts = [];
          }
          var _loop = function _loop() {
            var original = _step.value;
            var source = original.mesh;
            if (!source) return 1; // continue
            var cursor = original.node,
              dynamic = wholeObjectMoves;
            while (cursor && cursor !== root) {
              if (movingParts.indexOf(cursor) >= 0) {
                dynamic = true;
                break;
              }
              cursor = cursor.parent;
            }
            var normalMatrix = new Mat3(),
              tangentMatrix = new Mat3();
            Mat3.inverseTransposeMat4(normalMatrix, original.node.worldMatrix);
            Mat3.fromMat4(tangentMatrix, original.node.worldMatrix);
            var _loop2 = function _loop2(p) {
              var read = function read(name) {
                var a = source.readAttribute(p, name);
                return a ? Array.from(a) : undefined;
              };
              var positions = read(gfx.AttributeName.ATTR_POSITION),
                material = original.sharedMaterials[p];
              if (!positions || !material) return 1; // continue
              var normals = read(gfx.AttributeName.ATTR_NORMAL) || positions.map(function (_, i) {
                  return i % 3 === 1 ? 1 : 0;
                }),
                tangents = read(gfx.AttributeName.ATTR_TANGENT);
              var world = new Float32Array(positions.length),
                wn = new Float32Array(normals.length),
                wt = [],
                v = new Vec3(),
                center = original.node.worldPosition.clone();
              var radius = 0;
              for (var i = 0; i < positions.length; i += 3) {
                v.set(positions[i], positions[i + 1], positions[i + 2]);
                Vec3.transformMat4(v, v, original.node.worldMatrix);
                world.set([v.x, v.y, v.z], i);
                radius = Math.max(radius, Vec3.distance(v, center));
                v.set(normals[i], normals[i + 1], normals[i + 2]);
                Vec3.transformMat3(v, v, normalMatrix);
                v.normalize();
                wn.set([v.x, v.y, v.z], i);
                // Match the engine's matWorld * vec4(tangent, 0), including nonuniform scale.
                var j = i / 3 * 4;
                if (tangents) {
                  v.set(tangents[j], tangents[j + 1], tangents[j + 2]);
                  Vec3.transformMat3(v, v, tangentMatrix);
                  v.normalize();
                  wt.push(v.x, v.y, v.z, tangents[j + 3]);
                } else wt.push(1, 0, 0, 1);
              }
              var count = positions.length / 3;
              var geometry = {
                positions: dynamic ? positions : Array.from(world),
                normals: dynamic ? normals : Array.from(wn),
                uvs: read(gfx.AttributeName.ATTR_TEX_COORD) || new Array(count * 2).fill(0),
                tangents: dynamic ? tangents || wt : wt,
                indices: Array.from(source.readIndices(p) || Array.from({
                  length: count
                }, function (_, i) {
                  return i;
                })),
                colors: new Array(count * 4).fill(1)
              };
              _this.entries.push({
                geometry: geometry,
                world: world,
                normals: wn,
                center: center,
                radius: radius,
                sum: 0,
                material: material,
                cast: original.shadowCastingMode,
                receive: original.receiveShadow,
                localNode: dynamic ? original.node : undefined,
                root: dynamic ? root : undefined
              });
            };
            for (var p = 0; p < source.struct.primitives.length; p++) {
              if (_loop2(p)) continue;
            }
            original.enabled = false;
          };
          for (var _iterator = _createForOfIteratorHelperLoose(root.getComponentsInChildren(MeshRenderer)), _step; !(_step = _iterator()).done;) {
            if (_loop()) continue;
          }
        };
        _proto.createBatches = function createBatches() {
          var current = new Map();
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.entries), _step2; !(_step2 = _iterator2()).done;) {
            var e = _step2.value;
            var groups = current.get(e.material);
            if (!groups) {
              groups = new Map();
              current.set(e.material, groups);
            }
            var key = e.cast + ':' + e.receive + ':' + Math.floor(e.center.x / 8) + ':' + Math.floor(e.center.z / 8);
            var batch = groups.get(key);
            var count = e.world.length / 3;
            if (e.localNode) {
              var node = new Node('Movable surface vertex light');
              e.localNode.addChild(node);
              var renderer = node.addComponent(MeshRenderer),
                material = new Material();
              material.copy(e.material, {
                defines: {
                  USE_VERTEX_COLOR: true
                }
              });
              renderer.setMaterial(material, 0);
              renderer.shadowCastingMode = e.cast;
              renderer.receiveShadow = e.receive;
              var movable = {
                entries: [e],
                geometry: e.geometry,
                renderer: renderer,
                mesh: null,
                material: material
              };
              e.batch = movable;
              e.offset = 0;
              this.batches.push(movable);
              continue;
            }
            if (!batch || batch.geometry.positions.length / 3 + count > 60000) {
              var _node = new Node('Static material vertex-light batch');
              this.parent.addChild(_node);
              var _renderer = _node.addComponent(MeshRenderer),
                _material = new Material();
              // Material.recompileShaders is a warning-only no-op in Creator 3.8.8;
              // copy overrides compile the vertex-colour variant on this new material.
              _material.copy(e.material, {
                defines: {
                  USE_VERTEX_COLOR: true
                }
              });
              _renderer.setMaterial(_material, 0);
              _renderer.shadowCastingMode = e.cast;
              _renderer.receiveShadow = e.receive;
              batch = {
                entries: [],
                geometry: {
                  positions: [],
                  normals: [],
                  uvs: [],
                  tangents: [],
                  indices: [],
                  colors: []
                },
                renderer: _renderer,
                mesh: null,
                material: _material
              };
              groups.set(key, batch);
              this.batches.push(batch);
            }
            var start = batch.geometry.positions.length / 3;
            e.offset = start * 4;
            e.batch = batch;
            batch.entries.push(e);
            for (var _i = 0, _arr = ['positions', 'normals', 'uvs', 'tangents', 'colors']; _i < _arr.length; _i++) {
              var name = _arr[_i];
              for (var _iterator4 = _createForOfIteratorHelperLoose(e.geometry[name]), _step4; !(_step4 = _iterator4()).done;) {
                var n = _step4.value;
                batch.geometry[name].push(n);
              }
            }
            for (var _iterator5 = _createForOfIteratorHelperLoose(e.geometry.indices), _step5; !(_step5 = _iterator5()).done;) {
              var _n = _step5.value;
              batch.geometry.indices.push(_n + start);
            }
          }
          // Creator 3.8.8 createMesh reads array-like channels by slice/length/index.
          // Keep one packed copy of static geometry; light evaluation reads views of
          // its world-space position/normal channels instead of retaining duplicates.
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.batches), _step3; !(_step3 = _iterator3()).done;) {
            var _batch$entries$;
            var _batch = _step3.value;
            if ((_batch$entries$ = _batch.entries[0]) != null && _batch$entries$.localNode) continue;
            var geometry = _batch.geometry;
            for (var _i2 = 0, _arr2 = ['positions', 'normals', 'uvs', 'tangents', 'colors']; _i2 < _arr2.length; _i2++) {
              var _name = _arr2[_i2];
              geometry[_name] = Float32Array.from(geometry[_name]);
            }
            geometry.indices = Uint32Array.from(geometry.indices);
            for (var _iterator6 = _createForOfIteratorHelperLoose(_batch.entries), _step6; !(_step6 = _iterator6()).done;) {
              var _e = _step6.value;
              var _start = _e.offset / 4 * 3,
                length = _e.world.length;
              _e.world = geometry.positions.subarray(_start, _start + length);
              _e.normals = geometry.normals.subarray(_start, _start + length);
              _e.geometry = null;
            }
          }
        };
        _proto.blocked = function blocked(s, x, z) {
          var key = s.id + ':' + x.toFixed(3) + ':' + z.toFixed(3),
            cached = this.visibilityCache.get(key);
          if (cached !== undefined) return cached;
          var dx = x - s.x,
            dz = z - s.z;
          for (var _iterator7 = _createForOfIteratorHelperLoose(this.wallBlocks), _step7; !(_step7 = _iterator7()).done;) {
            var w = _step7.value;
            if (Math.max(x, s.x) < w.x - w.w / 2 || Math.min(x, s.x) > w.x + w.w / 2 || Math.max(z, s.z) < w.z - w.d / 2 || Math.min(z, s.z) > w.z + w.d / 2) continue;
            // The wall's collision is slightly thicker than its plaster mesh. A point
            // on that receiving wall must not shadow itself; intervening walls still do.
            if (Math.abs(x - w.x) <= w.w / 2 + .025 && Math.abs(z - w.z) <= w.d / 2 + .025) continue;
            var lo = .04,
              hi = .96;
            for (var _i3 = 0, _arr3 = [[s.x, dx, w.x, w.w / 2], [s.z, dz, w.z, w.d / 2]]; _i3 < _arr3.length; _i3++) {
              var _arr3$_i = _arr3[_i3],
                a = _arr3$_i[0],
                d = _arr3$_i[1],
                c = _arr3$_i[2],
                h = _arr3$_i[3];
              if (Math.abs(d) < 1e-8) {
                if (Math.abs(a - c) > h) {
                  lo = 2;
                  break;
                }
              } else {
                var t1 = (c - h - a) / d,
                  t2 = (c + h - a) / d;
                lo = Math.max(lo, Math.min(t1, t2));
                hi = Math.min(hi, Math.max(t1, t2));
              }
            }
            if (lo < hi) {
              this.visibilityCache.set(key, true);
              return true;
            }
          }
          this.visibilityCache.set(key, false);
          return false;
        };
        _proto.refreshMoving = function refreshMoving(sources, roots) {
          this.update(sources, undefined, roots);
        };
        _proto.update = function update(sources, changed, movingRoots) {
          var _this2 = this;
          this.visibilityCache.clear();
          if (!this.batches.length) this.createBatches();
          var dirty = new Set();
          var _loop3 = function _loop3() {
              var e = _step8.value;
              if (movingRoots && (!e.root || !movingRoots.has(e.root))) return 0; // continue
              if (e.localNode) e.center.set(e.localNode.worldPosition);
              if (changed && Vec3.distance(e.center, new Vec3(changed.x, changed.y, changed.z)) > changed.range + e.radius) return 0; // continue
              var nearby = sources.filter(function (s) {
                return s.on && Vec3.distance(e.center, new Vec3(s.x, s.y, s.z)) < s.range + e.radius;
              });
              e.sum = 0;
              if (e.localNode) {
                var matrix = e.localNode.worldMatrix,
                  nm = new Mat3(),
                  v = new Vec3();
                Mat3.inverseTransposeMat4(nm, matrix);
                e.center.set(e.localNode.worldPosition);
                for (var i = 0; i < e.world.length; i += 3) {
                  v.set(e.geometry.positions[i], e.geometry.positions[i + 1], e.geometry.positions[i + 2]);
                  Vec3.transformMat4(v, v, matrix);
                  e.world.set([v.x, v.y, v.z], i);
                  v.set(e.geometry.normals[i], e.geometry.normals[i + 1], e.geometry.normals[i + 2]);
                  Vec3.transformMat3(v, v, nm);
                  v.normalize();
                  e.normals.set([v.x, v.y, v.z], i);
                }
              }
              var _loop4 = function _loop4() {
                var x = e.world[_i4],
                  y = e.world[_i4 + 1],
                  z = e.world[_i4 + 2];
                var zone = _this2.darkZones.find(function (r) {
                  return x > r[0] && x < r[1] && z > r[2] && z < r[3];
                });
                var red = zone ? .08 : 1.05,
                  green = zone ? .025 : 1.02,
                  blue = zone ? .035 : 1;
                var _loop5 = function _loop5() {
                    var s = _step10.value;
                    var sz = _this2.darkZones.find(function (r) {
                      return s.x > r[0] && s.x < r[1] && s.z > r[2] && s.z < r[3];
                    });
                    if (sz !== zone) return 0; // continue
                    var dx = s.x - x,
                      dy = s.y - y,
                      dz = s.z - z,
                      d = Math.hypot(dx, dy, dz);
                    if (d >= s.range || _this2.blocked(s, x, z)) return 0; // continue
                    var facing = Math.max(.15, (dx * e.normals[_i4] + dy * e.normals[_i4 + 1] + dz * e.normals[_i4 + 2]) / Math.max(.01, d)),
                      k = Math.pow(1 - d / s.range, 2) * facing;
                    red += s.color[0] * k;
                    green += s.color[1] * k;
                    blue += s.color[2] * k;
                  },
                  _ret2;
                for (var _iterator10 = _createForOfIteratorHelperLoose(nearby), _step10; !(_step10 = _iterator10()).done;) {
                  _ret2 = _loop5();
                  if (_ret2 === 0) continue;
                }
                // builtin-standard converts vertex colours from sRGB to linear. Encode
                // these linear diffuse multipliers once, avoiding a second gamma boost.
                var c = e.batch.geometry.colors,
                  offset = e.offset + j;
                c[offset] = Math.pow(red, 1 / 2.2);
                c[offset + 1] = Math.pow(green, 1 / 2.2);
                c[offset + 2] = Math.pow(blue, 1 / 2.2);
                c[offset + 3] = 1;
                e.sum += red + green + blue;
              };
              for (var _i4 = 0, j = 0; _i4 < e.world.length; _i4 += 3, j += 4) {
                _loop4();
              }
              dirty.add(e.batch);
            },
            _ret;
          for (var _iterator8 = _createForOfIteratorHelperLoose(this.entries), _step8; !(_step8 = _iterator8()).done;) {
            _ret = _loop3();
            if (_ret === 0) continue;
          }
          for (var _iterator9 = _createForOfIteratorHelperLoose(dirty), _step9; !(_step9 = _iterator9()).done;) {
            var batch = _step9.value;
            var previous = batch.mesh;
            batch.mesh = utils.createMesh(batch.geometry, undefined, {
              calculateBounds: true
            });
            batch.renderer.mesh = batch.mesh;
            previous == null || previous.destroy();
          }
          this.visibilityCache.clear();
        };
        _proto.destroy = function destroy() {
          for (var _iterator11 = _createForOfIteratorHelperLoose(this.batches), _step11; !(_step11 = _iterator11()).done;) {
            var _b$mesh;
            var b = _step11.value;
            (_b$mesh = b.mesh) == null || _b$mesh.destroy();
            b.material.destroy();
            b.renderer.node.destroy();
          }
          this.entries = [];
          this.batches = [];
        };
        _createClass(TavernBakedLight, [{
          key: "count",
          get: function get() {
            return this.batches.length;
          }
        }, {
          key: "sourceCount",
          get: function get() {
            return this.entries.length;
          }
        }, {
          key: "signature",
          get: function get() {
            return this.entries.reduce(function (sum, e) {
              return sum + e.sum;
            }, 0);
          }
        }]);
        return TavernBakedLight;
      }());
      cclegacy._RF.pop();
    }
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});
