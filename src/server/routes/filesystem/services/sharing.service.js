"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharingService = void 0;
var common_1 = require("@nestjs/common");
var sanitize_filename_1 = require("sanitize-filename");
var rate_limiter_flexible_1 = require("rate-limiter-flexible");
var crypto_1 = require("crypto");
var bcrypt = require("bcrypt");
var sharing_dto_1 = require("../dto/sharing.dto");
var SHARE_INFO_PREFIX = 'share:';
var CACHE_TTL = 3600; // 1 hour
var SALT_ROUNDS = 10;
var SharingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SharingService = _classThis = /** @class */ (function () {
        function SharingService_1(shareRepository, accessLogRepository, cacheManager, configService) {
            this.shareRepository = shareRepository;
            this.accessLogRepository = accessLogRepository;
            this.cacheManager = cacheManager;
            this.configService = configService;
            this.rateLimiters = new Map();
            // Type assertion since cache-manager types are not complete
            this.store = cacheManager.store;
        }
        SharingService_1.prototype.getCachedShareInfo = function (shareId) {
            return __awaiter(this, void 0, void 0, function () {
                var key, result, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            key = "".concat(SHARE_INFO_PREFIX).concat(shareId);
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.store.get(key)];
                        case 2:
                            result = _b.sent();
                            return [2 /*return*/, result !== null && result !== void 0 ? result : null];
                        case 3:
                            _a = _b.sent();
                            return [2 /*return*/, null];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.setCachedShareInfo = function (shareId, info) {
            return __awaiter(this, void 0, void 0, function () {
                var key, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "".concat(SHARE_INFO_PREFIX).concat(shareId);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.store.set(key, info, { ttl: CACHE_TTL })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _a.sent();
                            console.error('Failed to set cache:', error_1);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.invalidateShareCache = function (shareId) {
            return __awaiter(this, void 0, void 0, function () {
                var key, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "".concat(SHARE_INFO_PREFIX).concat(shareId);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.store.del(key)];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_2 = _a.sent();
                            console.error('Failed to invalidate cache:', error_2);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.validateSecurity = function (share, req) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function () {
                var security, clientIp, referrer_1, csrfToken, storedToken, rateLimiter, clientIp, error_3;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            security = share.security;
                            if (!security) {
                                return [2 /*return*/, { isValid: true }];
                            }
                            // Check IP allowlist
                            if (security.allowedIps && security.allowedIps.length > 0) {
                                clientIp = req.ip;
                                if (!clientIp || !security.allowedIps.includes(clientIp)) {
                                    return [2 /*return*/, {
                                            isValid: false,
                                            error: 'IP address not allowed'
                                        }];
                                }
                            }
                            // Check referrer allowlist
                            if (security.allowedReferrers && security.allowedReferrers.length > 0) {
                                referrer_1 = (_a = req.get('referer')) !== null && _a !== void 0 ? _a : '';
                                if (!referrer_1 || !security.allowedReferrers.some(function (allowed) { return referrer_1.startsWith(allowed); })) {
                                    return [2 /*return*/, {
                                            isValid: false,
                                            error: 'Invalid referrer'
                                        }];
                                }
                            }
                            if (!security.csrfProtection) return [3 /*break*/, 2];
                            csrfToken = req.get('x-csrf-token');
                            if (!csrfToken) {
                                return [2 /*return*/, {
                                        isValid: false,
                                        error: 'CSRF token required'
                                    }];
                            }
                            return [4 /*yield*/, this.getCachedCsrfToken(share.id)];
                        case 1:
                            storedToken = _c.sent();
                            if (!storedToken || csrfToken !== storedToken) {
                                return [2 /*return*/, {
                                        isValid: false,
                                        error: 'Invalid CSRF token'
                                    }];
                            }
                            _c.label = 2;
                        case 2:
                            if (!security.rateLimit) return [3 /*break*/, 6];
                            _c.label = 3;
                        case 3:
                            _c.trys.push([3, 5, , 6]);
                            rateLimiter = this.getRateLimiter(share);
                            clientIp = (_b = req.ip) !== null && _b !== void 0 ? _b : '';
                            return [4 /*yield*/, rateLimiter.consume(clientIp)];
                        case 4:
                            _c.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            error_3 = _c.sent();
                            return [2 /*return*/, {
                                    isValid: false,
                                    error: 'Rate limit exceeded'
                                }];
                        case 6: return [2 /*return*/, { isValid: true }];
                    }
                });
            });
        };
        SharingService_1.prototype.getRateLimiter = function (share) {
            var _a, _b;
            if (!this.rateLimiters.has(share.id)) {
                var security = share.security;
                var config = security === null || security === void 0 ? void 0 : security.rateLimit;
                var limiterConfig = {
                    points: (_a = config === null || config === void 0 ? void 0 : config.maxRequests) !== null && _a !== void 0 ? _a : 60,
                    duration: ((_b = config === null || config === void 0 ? void 0 : config.windowMinutes) !== null && _b !== void 0 ? _b : 1) * 60,
                    blockDuration: 0,
                    execEvenly: false,
                    keyPrefix: "rate_limit:".concat(share.id, ":")
                };
                var limiter = new rate_limiter_flexible_1.RateLimiterMemory(limiterConfig);
                this.rateLimiters.set(share.id, limiter);
                return limiter;
            }
            var existingLimiter = this.rateLimiters.get(share.id);
            if (!existingLimiter) {
                throw new Error('Rate limiter not found');
            }
            return existingLimiter;
        };
        SharingService_1.prototype.getCachedCsrfToken = function (shareId) {
            return __awaiter(this, void 0, void 0, function () {
                var key, result, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            key = "".concat(SHARE_INFO_PREFIX).concat(shareId, ":csrf");
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.store.get(key)];
                        case 2:
                            result = _b.sent();
                            return [2 /*return*/, result !== null && result !== void 0 ? result : null];
                        case 3:
                            _a = _b.sent();
                            return [2 /*return*/, null];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.setCachedCsrfToken = function (shareId, token) {
            return __awaiter(this, void 0, void 0, function () {
                var key, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "".concat(SHARE_INFO_PREFIX).concat(shareId, ":csrf");
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.store.set(key, token, { ttl: CACHE_TTL })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_4 = _a.sent();
                            console.error('Failed to set CSRF token:', error_4);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.hashPassword = function (password) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, bcrypt.hash(password, SALT_ROUNDS)];
                });
            });
        };
        SharingService_1.prototype.createShare = function (req) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function () {
                var share, _c, _d, _e, savedShare, shareInfo, error_5;
                var _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _d = (_c = this.shareRepository).create;
                            _f = {
                                path: (0, sanitize_filename_1.default)(req.path),
                                accessType: req.accessType,
                                status: sharing_dto_1.ShareStatus.ACTIVE,
                                allowZipDownload: (_a = req.allowZipDownload) !== null && _a !== void 0 ? _a : false,
                                metadata: req.metadata,
                                security: req.security
                            };
                            if (!((_b = req.security) === null || _b === void 0 ? void 0 : _b.password)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.hashPassword(req.security.password)];
                        case 1:
                            _e = _g.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _e = undefined;
                            _g.label = 3;
                        case 3:
                            share = _d.apply(_c, [(_f.passwordHash = _e,
                                    _f)]);
                            _g.label = 4;
                        case 4:
                            _g.trys.push([4, 7, , 8]);
                            return [4 /*yield*/, this.shareRepository.save(share)];
                        case 5:
                            savedShare = _g.sent();
                            shareInfo = this.toShareInfoDto(savedShare);
                            return [4 /*yield*/, this.setCachedShareInfo(savedShare.id, shareInfo)];
                        case 6:
                            _g.sent();
                            return [2 /*return*/, shareInfo];
                        case 7:
                            error_5 = _g.sent();
                            throw this.handleError(error_5);
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.modifyShare = function (req) {
            var _a, _b, _c;
            return __awaiter(this, void 0, void 0, function () {
                var share, security, updatedSecurity, _d, csrfToken, savedShare, shareInfo, error_6;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.shareRepository.findOne({ where: { id: req.shareId } })];
                        case 1:
                            share = _e.sent();
                            if (!share) {
                                throw new common_1.NotFoundException('Share not found');
                            }
                            // Update fields if provided
                            share.allowZipDownload = (_a = req.allowZipDownload) !== null && _a !== void 0 ? _a : share.allowZipDownload;
                            share.metadata = (_b = req.metadata) !== null && _b !== void 0 ? _b : share.metadata;
                            if (!req.security) return [3 /*break*/, 7];
                            security = share.security;
                            updatedSecurity = __assign(__assign(__assign({}, security), req.security), { rateLimit: (_c = req.security.rateLimit) !== null && _c !== void 0 ? _c : security === null || security === void 0 ? void 0 : security.rateLimit });
                            share.security = updatedSecurity;
                            if (!req.security.password) return [3 /*break*/, 3];
                            _d = share;
                            return [4 /*yield*/, this.hashPassword(req.security.password)];
                        case 2:
                            _d.passwordHash = _e.sent();
                            _e.label = 3;
                        case 3:
                            if (!req.security.csrfProtection) return [3 /*break*/, 5];
                            csrfToken = (0, crypto_1.randomBytes)(32).toString('hex');
                            return [4 /*yield*/, this.setCachedCsrfToken(share.id, csrfToken)];
                        case 4:
                            _e.sent();
                            share.csrfToken = csrfToken;
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, this.store.del("".concat(SHARE_INFO_PREFIX).concat(share.id, ":csrf"))];
                        case 6:
                            _e.sent();
                            share.csrfToken = undefined;
                            _e.label = 7;
                        case 7:
                            _e.trys.push([7, 10, , 11]);
                            return [4 /*yield*/, this.shareRepository.save(share)];
                        case 8:
                            savedShare = _e.sent();
                            shareInfo = this.toShareInfoDto(savedShare);
                            return [4 /*yield*/, this.setCachedShareInfo(savedShare.id, shareInfo)];
                        case 9:
                            _e.sent();
                            return [2 /*return*/, shareInfo];
                        case 10:
                            error_6 = _e.sent();
                            throw this.handleError(error_6);
                        case 11: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.listShares = function (req) {
            var _a, _b, _c, _d;
            return __awaiter(this, void 0, void 0, function () {
                var where, _e, shares, total, items, error_7;
                var _f;
                var _this = this;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            where = {};
                            if (req.path) {
                                where.path = req.path;
                            }
                            if (!req.includeExpired) {
                                where.status = sharing_dto_1.ShareStatus.ACTIVE;
                            }
                            _g.label = 1;
                        case 1:
                            _g.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.shareRepository.findAndCount({
                                    where: where,
                                    skip: req.offset,
                                    take: req.limit,
                                    order: (_f = {},
                                        _f[(_a = req.sortBy) !== null && _a !== void 0 ? _a : 'createdAt'] = (_b = req.sortOrder) !== null && _b !== void 0 ? _b : 'DESC',
                                        _f)
                                })];
                        case 2:
                            _e = _g.sent(), shares = _e[0], total = _e[1];
                            items = shares.map(function (share) { return _this.toShareInfoDto(share); });
                            return [2 /*return*/, {
                                    items: items,
                                    total: total,
                                    offset: (_c = req.offset) !== null && _c !== void 0 ? _c : 0,
                                    limit: (_d = req.limit) !== null && _d !== void 0 ? _d : 20
                                }];
                        case 3:
                            error_7 = _g.sent();
                            throw this.handleError(error_7);
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        SharingService_1.prototype.handleError = function (error) {
            // Log error details
            console.error('Operation failed:', error);
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException ||
                error instanceof common_1.UnauthorizedException) {
                return error;
            }
            // Return a generic error to avoid leaking implementation details
            return new Error('Internal server error');
        };
        SharingService_1.prototype.toShareInfoDto = function (share) {
            var _a;
            var baseUrl = (_a = this.configService.get('BASE_URL')) !== null && _a !== void 0 ? _a : '';
            var shareUrl = baseUrl ? "".concat(baseUrl, "/share/").concat(share.id) : "/share/".concat(share.id);
            return {
                id: share.id,
                path: share.path,
                accessType: share.accessType,
                status: share.status,
                url: shareUrl,
                allowZipDownload: share.allowZipDownload,
                security: share.security,
                csrfToken: share.csrfToken,
                createdAt: share.createdAt,
                expiresAt: share.expiresAt,
                createdBy: 'system', // TODO: Add user context
                accessCount: share.accessCount,
                lastAccessedAt: share.lastAccessedAt,
                hasPassword: !!share.passwordHash,
                metadata: share.metadata
            };
        };
        return SharingService_1;
    }());
    __setFunctionName(_classThis, "SharingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SharingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SharingService = _classThis;
}();
exports.SharingService = SharingService;
