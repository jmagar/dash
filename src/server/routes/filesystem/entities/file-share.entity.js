"use strict";
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileShare = void 0;
var typeorm_1 = require("typeorm");
var sharing_dto_1 = require("../dto/sharing.dto");
var FileShare = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('file_share')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _id_decorators;
    var _id_initializers = [];
    var _path_decorators;
    var _path_initializers = [];
    var _accessType_decorators;
    var _accessType_initializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _expiresAt_decorators;
    var _expiresAt_initializers = [];
    var _accessCount_decorators;
    var _accessCount_initializers = [];
    var _maxAccesses_decorators;
    var _maxAccesses_initializers = [];
    var _passwordHash_decorators;
    var _passwordHash_initializers = [];
    var _allowZipDownload_decorators;
    var _allowZipDownload_initializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _security_decorators;
    var _security_initializers = [];
    var _csrfToken_decorators;
    var _csrfToken_initializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _lastAccessedAt_decorators;
    var _lastAccessedAt_initializers = [];
    var _accessLog_decorators;
    var _accessLog_initializers = [];
    var FileShare = _classThis = /** @class */ (function () {
        function FileShare_1() {
            this.id = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _id_initializers, void 0));
            this.path = __runInitializers(this, _path_initializers, void 0);
            this.accessType = __runInitializers(this, _accessType_initializers, void 0);
            this.status = __runInitializers(this, _status_initializers, void 0);
            this.createdAt = __runInitializers(this, _createdAt_initializers, void 0);
            this.expiresAt = __runInitializers(this, _expiresAt_initializers, void 0);
            this.accessCount = __runInitializers(this, _accessCount_initializers, void 0);
            this.maxAccesses = __runInitializers(this, _maxAccesses_initializers, void 0);
            this.passwordHash = __runInitializers(this, _passwordHash_initializers, void 0);
            this.allowZipDownload = __runInitializers(this, _allowZipDownload_initializers, void 0);
            this.metadata = __runInitializers(this, _metadata_initializers, void 0);
            this.security = __runInitializers(this, _security_initializers, void 0);
            this.csrfToken = __runInitializers(this, _csrfToken_initializers, void 0);
            this.updatedAt = __runInitializers(this, _updatedAt_initializers, void 0);
            this.lastAccessedAt = __runInitializers(this, _lastAccessedAt_initializers, void 0);
            this.accessLog = __runInitializers(this, _accessLog_initializers, void 0);
        }
        return FileShare_1;
    }());
    __setFunctionName(_classThis, "FileShare");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _path_decorators = [(0, typeorm_1.Column)()];
        _accessType_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: sharing_dto_1.ShareAccessType,
                default: sharing_dto_1.ShareAccessType.PUBLIC
            })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: sharing_dto_1.ShareStatus,
                default: sharing_dto_1.ShareStatus.ACTIVE
            })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _expiresAt_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _accessCount_decorators = [(0, typeorm_1.Column)({ default: 0 })];
        _maxAccesses_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _passwordHash_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _allowZipDownload_decorators = [(0, typeorm_1.Column)({ default: false })];
        _metadata_decorators = [(0, typeorm_1.Column)({ type: 'jsonb', nullable: true })];
        _security_decorators = [(0, typeorm_1.Column)({ type: 'jsonb', nullable: true })];
        _csrfToken_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _lastAccessedAt_decorators = [(0, typeorm_1.Column)({ nullable: true, type: 'timestamp' })];
        _accessLog_decorators = [(0, typeorm_1.Column)({ type: 'jsonb', nullable: true })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _path_decorators, { kind: "field", name: "path", static: false, private: false, access: { has: function (obj) { return "path" in obj; }, get: function (obj) { return obj.path; }, set: function (obj, value) { obj.path = value; } }, metadata: _metadata }, _path_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _accessType_decorators, { kind: "field", name: "accessType", static: false, private: false, access: { has: function (obj) { return "accessType" in obj; }, get: function (obj) { return obj.accessType; }, set: function (obj, value) { obj.accessType = value; } }, metadata: _metadata }, _accessType_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _expiresAt_decorators, { kind: "field", name: "expiresAt", static: false, private: false, access: { has: function (obj) { return "expiresAt" in obj; }, get: function (obj) { return obj.expiresAt; }, set: function (obj, value) { obj.expiresAt = value; } }, metadata: _metadata }, _expiresAt_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _accessCount_decorators, { kind: "field", name: "accessCount", static: false, private: false, access: { has: function (obj) { return "accessCount" in obj; }, get: function (obj) { return obj.accessCount; }, set: function (obj, value) { obj.accessCount = value; } }, metadata: _metadata }, _accessCount_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _maxAccesses_decorators, { kind: "field", name: "maxAccesses", static: false, private: false, access: { has: function (obj) { return "maxAccesses" in obj; }, get: function (obj) { return obj.maxAccesses; }, set: function (obj, value) { obj.maxAccesses = value; } }, metadata: _metadata }, _maxAccesses_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _passwordHash_decorators, { kind: "field", name: "passwordHash", static: false, private: false, access: { has: function (obj) { return "passwordHash" in obj; }, get: function (obj) { return obj.passwordHash; }, set: function (obj, value) { obj.passwordHash = value; } }, metadata: _metadata }, _passwordHash_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _allowZipDownload_decorators, { kind: "field", name: "allowZipDownload", static: false, private: false, access: { has: function (obj) { return "allowZipDownload" in obj; }, get: function (obj) { return obj.allowZipDownload; }, set: function (obj, value) { obj.allowZipDownload = value; } }, metadata: _metadata }, _allowZipDownload_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _security_decorators, { kind: "field", name: "security", static: false, private: false, access: { has: function (obj) { return "security" in obj; }, get: function (obj) { return obj.security; }, set: function (obj, value) { obj.security = value; } }, metadata: _metadata }, _security_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _csrfToken_decorators, { kind: "field", name: "csrfToken", static: false, private: false, access: { has: function (obj) { return "csrfToken" in obj; }, get: function (obj) { return obj.csrfToken; }, set: function (obj, value) { obj.csrfToken = value; } }, metadata: _metadata }, _csrfToken_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _lastAccessedAt_decorators, { kind: "field", name: "lastAccessedAt", static: false, private: false, access: { has: function (obj) { return "lastAccessedAt" in obj; }, get: function (obj) { return obj.lastAccessedAt; }, set: function (obj, value) { obj.lastAccessedAt = value; } }, metadata: _metadata }, _lastAccessedAt_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _accessLog_decorators, { kind: "field", name: "accessLog", static: false, private: false, access: { has: function (obj) { return "accessLog" in obj; }, get: function (obj) { return obj.accessLog; }, set: function (obj, value) { obj.accessLog = value; } }, metadata: _metadata }, _accessLog_initializers, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FileShare = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FileShare = _classThis;
}();
exports.FileShare = FileShare;
