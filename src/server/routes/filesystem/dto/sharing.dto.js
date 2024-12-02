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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSharesResponseDto = exports.ListSharesRequestDto = exports.RevokeShareRequestDto = exports.ModifyShareRequestDto = exports.ShareAccessRequestDto = exports.ShareInfoDto = exports.CreateShareRequestDto = exports.ShareSecurityDto = exports.ShareStatus = exports.SortOrder = exports.ShareSortBy = exports.ShareAccessType = void 0;
var swagger_1 = require("@nestjs/swagger");
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var ShareAccessType;
(function (ShareAccessType) {
    ShareAccessType["PUBLIC"] = "public";
    ShareAccessType["PASSWORD"] = "password";
    ShareAccessType["TOKEN"] = "token";
})(ShareAccessType || (exports.ShareAccessType = ShareAccessType = {}));
var ShareSortBy;
(function (ShareSortBy) {
    ShareSortBy["CREATED_AT"] = "createdAt";
    ShareSortBy["LAST_ACCESSED"] = "lastAccessed";
    ShareSortBy["ACCESS_COUNT"] = "accessCount";
})(ShareSortBy || (exports.ShareSortBy = ShareSortBy = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "asc";
    SortOrder["DESC"] = "desc";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
var ShareStatus;
(function (ShareStatus) {
    ShareStatus["ACTIVE"] = "active";
    ShareStatus["EXPIRED"] = "expired";
    ShareStatus["REVOKED"] = "revoked";
})(ShareStatus || (exports.ShareStatus = ShareStatus = {}));
var ShareSecurityDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _csrfProtection_decorators;
    var _csrfProtection_initializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _expiresIn_decorators;
    var _expiresIn_initializers = [];
    return _a = /** @class */ (function () {
            function ShareSecurityDto() {
                this.csrfProtection = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _csrfProtection_initializers, false));
                this.password = __runInitializers(this, _password_initializers, void 0);
                this.expiresIn = __runInitializers(this, _expiresIn_initializers, void 0);
            }
            return ShareSecurityDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _csrfProtection_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _password_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _expiresIn_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _csrfProtection_decorators, { kind: "field", name: "csrfProtection", static: false, private: false, access: { has: function (obj) { return "csrfProtection" in obj; }, get: function (obj) { return obj.csrfProtection; }, set: function (obj, value) { obj.csrfProtection = value; } }, metadata: _metadata }, _csrfProtection_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _expiresIn_decorators, { kind: "field", name: "expiresIn", static: false, private: false, access: { has: function (obj) { return "expiresIn" in obj; }, get: function (obj) { return obj.expiresIn; }, set: function (obj, value) { obj.expiresIn = value; } }, metadata: _metadata }, _expiresIn_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ShareSecurityDto = ShareSecurityDto;
var CreateShareRequestDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _path_decorators;
    var _path_initializers = [];
    var _allowZipDownload_decorators;
    var _allowZipDownload_initializers = [];
    var _security_decorators;
    var _security_initializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _accessType_decorators;
    var _accessType_initializers = [];
    return _a = /** @class */ (function () {
            function CreateShareRequestDto() {
                this.path = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _path_initializers, void 0));
                this.allowZipDownload = __runInitializers(this, _allowZipDownload_initializers, false);
                this.security = __runInitializers(this, _security_initializers, void 0);
                this.metadata = __runInitializers(this, _metadata_initializers, void 0);
                this.accessType = __runInitializers(this, _accessType_initializers, void 0);
            }
            return CreateShareRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _path_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _allowZipDownload_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _security_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_transformer_1.Type)(function () { return ShareSecurityDto; }), (0, class_validator_1.IsOptional)()];
            _metadata_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsObject)(), (0, class_validator_1.IsOptional)()];
            _accessType_decorators = [(0, swagger_1.ApiProperty)({ enum: ShareAccessType }), (0, class_validator_1.IsEnum)(ShareAccessType)];
            __esDecorate(null, null, _path_decorators, { kind: "field", name: "path", static: false, private: false, access: { has: function (obj) { return "path" in obj; }, get: function (obj) { return obj.path; }, set: function (obj, value) { obj.path = value; } }, metadata: _metadata }, _path_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _allowZipDownload_decorators, { kind: "field", name: "allowZipDownload", static: false, private: false, access: { has: function (obj) { return "allowZipDownload" in obj; }, get: function (obj) { return obj.allowZipDownload; }, set: function (obj, value) { obj.allowZipDownload = value; } }, metadata: _metadata }, _allowZipDownload_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _security_decorators, { kind: "field", name: "security", static: false, private: false, access: { has: function (obj) { return "security" in obj; }, get: function (obj) { return obj.security; }, set: function (obj, value) { obj.security = value; } }, metadata: _metadata }, _security_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _accessType_decorators, { kind: "field", name: "accessType", static: false, private: false, access: { has: function (obj) { return "accessType" in obj; }, get: function (obj) { return obj.accessType; }, set: function (obj, value) { obj.accessType = value; } }, metadata: _metadata }, _accessType_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateShareRequestDto = CreateShareRequestDto;
var ShareInfoDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _id_decorators;
    var _id_initializers = [];
    var _path_decorators;
    var _path_initializers = [];
    var _accessType_decorators;
    var _accessType_initializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _url_decorators;
    var _url_initializers = [];
    var _allowZipDownload_decorators;
    var _allowZipDownload_initializers = [];
    var _security_decorators;
    var _security_initializers = [];
    var _csrfToken_decorators;
    var _csrfToken_initializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _expiresAt_decorators;
    var _expiresAt_initializers = [];
    var _createdBy_decorators;
    var _createdBy_initializers = [];
    var _accessCount_decorators;
    var _accessCount_initializers = [];
    var _lastAccessedAt_decorators;
    var _lastAccessedAt_initializers = [];
    var _hasPassword_decorators;
    var _hasPassword_initializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    return _a = /** @class */ (function () {
            function ShareInfoDto() {
                this.id = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _id_initializers, void 0));
                this.path = __runInitializers(this, _path_initializers, void 0);
                this.accessType = __runInitializers(this, _accessType_initializers, void 0);
                this.status = __runInitializers(this, _status_initializers, void 0);
                this.url = __runInitializers(this, _url_initializers, void 0);
                this.allowZipDownload = __runInitializers(this, _allowZipDownload_initializers, false);
                this.security = __runInitializers(this, _security_initializers, void 0);
                this.csrfToken = __runInitializers(this, _csrfToken_initializers, void 0);
                this.createdAt = __runInitializers(this, _createdAt_initializers, void 0);
                this.expiresAt = __runInitializers(this, _expiresAt_initializers, void 0);
                this.createdBy = __runInitializers(this, _createdBy_initializers, void 0);
                this.accessCount = __runInitializers(this, _accessCount_initializers, void 0);
                this.lastAccessedAt = __runInitializers(this, _lastAccessedAt_initializers, void 0);
                this.hasPassword = __runInitializers(this, _hasPassword_initializers, false);
                this.metadata = __runInitializers(this, _metadata_initializers, void 0);
            }
            return ShareInfoDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _path_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _accessType_decorators = [(0, swagger_1.ApiProperty)({ enum: ShareAccessType }), (0, class_validator_1.IsEnum)(ShareAccessType)];
            _status_decorators = [(0, swagger_1.ApiProperty)({ enum: ShareStatus }), (0, class_validator_1.IsEnum)(ShareStatus)];
            _url_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _allowZipDownload_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _security_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_transformer_1.Type)(function () { return ShareSecurityDto; }), (0, class_validator_1.IsOptional)()];
            _csrfToken_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _createdAt_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsDateString)()];
            _expiresAt_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsDateString)(), (0, class_validator_1.IsOptional)()];
            _createdBy_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _accessCount_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsNumber)()];
            _lastAccessedAt_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsDateString)(), (0, class_validator_1.IsOptional)()];
            _hasPassword_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _metadata_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsObject)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _path_decorators, { kind: "field", name: "path", static: false, private: false, access: { has: function (obj) { return "path" in obj; }, get: function (obj) { return obj.path; }, set: function (obj, value) { obj.path = value; } }, metadata: _metadata }, _path_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _accessType_decorators, { kind: "field", name: "accessType", static: false, private: false, access: { has: function (obj) { return "accessType" in obj; }, get: function (obj) { return obj.accessType; }, set: function (obj, value) { obj.accessType = value; } }, metadata: _metadata }, _accessType_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _url_decorators, { kind: "field", name: "url", static: false, private: false, access: { has: function (obj) { return "url" in obj; }, get: function (obj) { return obj.url; }, set: function (obj, value) { obj.url = value; } }, metadata: _metadata }, _url_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _allowZipDownload_decorators, { kind: "field", name: "allowZipDownload", static: false, private: false, access: { has: function (obj) { return "allowZipDownload" in obj; }, get: function (obj) { return obj.allowZipDownload; }, set: function (obj, value) { obj.allowZipDownload = value; } }, metadata: _metadata }, _allowZipDownload_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _security_decorators, { kind: "field", name: "security", static: false, private: false, access: { has: function (obj) { return "security" in obj; }, get: function (obj) { return obj.security; }, set: function (obj, value) { obj.security = value; } }, metadata: _metadata }, _security_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _csrfToken_decorators, { kind: "field", name: "csrfToken", static: false, private: false, access: { has: function (obj) { return "csrfToken" in obj; }, get: function (obj) { return obj.csrfToken; }, set: function (obj, value) { obj.csrfToken = value; } }, metadata: _metadata }, _csrfToken_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _expiresAt_decorators, { kind: "field", name: "expiresAt", static: false, private: false, access: { has: function (obj) { return "expiresAt" in obj; }, get: function (obj) { return obj.expiresAt; }, set: function (obj, value) { obj.expiresAt = value; } }, metadata: _metadata }, _expiresAt_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _createdBy_decorators, { kind: "field", name: "createdBy", static: false, private: false, access: { has: function (obj) { return "createdBy" in obj; }, get: function (obj) { return obj.createdBy; }, set: function (obj, value) { obj.createdBy = value; } }, metadata: _metadata }, _createdBy_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _accessCount_decorators, { kind: "field", name: "accessCount", static: false, private: false, access: { has: function (obj) { return "accessCount" in obj; }, get: function (obj) { return obj.accessCount; }, set: function (obj, value) { obj.accessCount = value; } }, metadata: _metadata }, _accessCount_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _lastAccessedAt_decorators, { kind: "field", name: "lastAccessedAt", static: false, private: false, access: { has: function (obj) { return "lastAccessedAt" in obj; }, get: function (obj) { return obj.lastAccessedAt; }, set: function (obj, value) { obj.lastAccessedAt = value; } }, metadata: _metadata }, _lastAccessedAt_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _hasPassword_decorators, { kind: "field", name: "hasPassword", static: false, private: false, access: { has: function (obj) { return "hasPassword" in obj; }, get: function (obj) { return obj.hasPassword; }, set: function (obj, value) { obj.hasPassword = value; } }, metadata: _metadata }, _hasPassword_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ShareInfoDto = ShareInfoDto;
var ShareAccessRequestDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _shareId_decorators;
    var _shareId_initializers = [];
    var _password_decorators;
    var _password_initializers = [];
    return _a = /** @class */ (function () {
            function ShareAccessRequestDto() {
                this.shareId = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _shareId_initializers, void 0));
                this.password = __runInitializers(this, _password_initializers, void 0);
            }
            return ShareAccessRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _shareId_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _password_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _shareId_decorators, { kind: "field", name: "shareId", static: false, private: false, access: { has: function (obj) { return "shareId" in obj; }, get: function (obj) { return obj.shareId; }, set: function (obj, value) { obj.shareId = value; } }, metadata: _metadata }, _shareId_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ShareAccessRequestDto = ShareAccessRequestDto;
var ModifyShareRequestDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _shareId_decorators;
    var _shareId_initializers = [];
    var _allowZipDownload_decorators;
    var _allowZipDownload_initializers = [];
    var _security_decorators;
    var _security_initializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    return _a = /** @class */ (function () {
            function ModifyShareRequestDto() {
                this.shareId = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _shareId_initializers, void 0));
                this.allowZipDownload = __runInitializers(this, _allowZipDownload_initializers, false);
                this.security = __runInitializers(this, _security_initializers, void 0);
                this.metadata = __runInitializers(this, _metadata_initializers, void 0);
            }
            return ModifyShareRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _shareId_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            _allowZipDownload_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _security_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_transformer_1.Type)(function () { return ShareSecurityDto; }), (0, class_validator_1.IsOptional)()];
            _metadata_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsObject)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _shareId_decorators, { kind: "field", name: "shareId", static: false, private: false, access: { has: function (obj) { return "shareId" in obj; }, get: function (obj) { return obj.shareId; }, set: function (obj, value) { obj.shareId = value; } }, metadata: _metadata }, _shareId_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _allowZipDownload_decorators, { kind: "field", name: "allowZipDownload", static: false, private: false, access: { has: function (obj) { return "allowZipDownload" in obj; }, get: function (obj) { return obj.allowZipDownload; }, set: function (obj, value) { obj.allowZipDownload = value; } }, metadata: _metadata }, _allowZipDownload_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _security_decorators, { kind: "field", name: "security", static: false, private: false, access: { has: function (obj) { return "security" in obj; }, get: function (obj) { return obj.security; }, set: function (obj, value) { obj.security = value; } }, metadata: _metadata }, _security_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ModifyShareRequestDto = ModifyShareRequestDto;
var RevokeShareRequestDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _shareId_decorators;
    var _shareId_initializers = [];
    return _a = /** @class */ (function () {
            function RevokeShareRequestDto() {
                this.shareId = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _shareId_initializers, void 0));
            }
            return RevokeShareRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _shareId_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _shareId_decorators, { kind: "field", name: "shareId", static: false, private: false, access: { has: function (obj) { return "shareId" in obj; }, get: function (obj) { return obj.shareId; }, set: function (obj, value) { obj.shareId = value; } }, metadata: _metadata }, _shareId_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RevokeShareRequestDto = RevokeShareRequestDto;
var ListSharesRequestDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _path_decorators;
    var _path_initializers = [];
    var _includeExpired_decorators;
    var _includeExpired_initializers = [];
    var _limit_decorators;
    var _limit_initializers = [];
    var _offset_decorators;
    var _offset_initializers = [];
    var _sortBy_decorators;
    var _sortBy_initializers = [];
    var _sortOrder_decorators;
    var _sortOrder_initializers = [];
    return _a = /** @class */ (function () {
            function ListSharesRequestDto() {
                this.path = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _path_initializers, void 0));
                this.includeExpired = __runInitializers(this, _includeExpired_initializers, false);
                this.limit = __runInitializers(this, _limit_initializers, void 0);
                this.offset = __runInitializers(this, _offset_initializers, void 0);
                this.sortBy = __runInitializers(this, _sortBy_initializers, void 0);
                this.sortOrder = __runInitializers(this, _sortOrder_initializers, void 0);
            }
            return ListSharesRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _path_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _includeExpired_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _limit_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _offset_decorators = [(0, swagger_1.ApiPropertyOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _sortBy_decorators = [(0, swagger_1.ApiPropertyOptional)({ enum: ShareSortBy }), (0, class_validator_1.IsEnum)(ShareSortBy), (0, class_validator_1.IsOptional)()];
            _sortOrder_decorators = [(0, swagger_1.ApiPropertyOptional)({ enum: SortOrder }), (0, class_validator_1.IsEnum)(SortOrder), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _path_decorators, { kind: "field", name: "path", static: false, private: false, access: { has: function (obj) { return "path" in obj; }, get: function (obj) { return obj.path; }, set: function (obj, value) { obj.path = value; } }, metadata: _metadata }, _path_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _includeExpired_decorators, { kind: "field", name: "includeExpired", static: false, private: false, access: { has: function (obj) { return "includeExpired" in obj; }, get: function (obj) { return obj.includeExpired; }, set: function (obj, value) { obj.includeExpired = value; } }, metadata: _metadata }, _includeExpired_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _limit_decorators, { kind: "field", name: "limit", static: false, private: false, access: { has: function (obj) { return "limit" in obj; }, get: function (obj) { return obj.limit; }, set: function (obj, value) { obj.limit = value; } }, metadata: _metadata }, _limit_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _offset_decorators, { kind: "field", name: "offset", static: false, private: false, access: { has: function (obj) { return "offset" in obj; }, get: function (obj) { return obj.offset; }, set: function (obj, value) { obj.offset = value; } }, metadata: _metadata }, _offset_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _sortBy_decorators, { kind: "field", name: "sortBy", static: false, private: false, access: { has: function (obj) { return "sortBy" in obj; }, get: function (obj) { return obj.sortBy; }, set: function (obj, value) { obj.sortBy = value; } }, metadata: _metadata }, _sortBy_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _sortOrder_decorators, { kind: "field", name: "sortOrder", static: false, private: false, access: { has: function (obj) { return "sortOrder" in obj; }, get: function (obj) { return obj.sortOrder; }, set: function (obj, value) { obj.sortOrder = value; } }, metadata: _metadata }, _sortOrder_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ListSharesRequestDto = ListSharesRequestDto;
var ListSharesResponseDto = function () {
    var _a;
    var _instanceExtraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _total_decorators;
    var _total_initializers = [];
    var _limit_decorators;
    var _limit_initializers = [];
    var _offset_decorators;
    var _offset_initializers = [];
    return _a = /** @class */ (function () {
            function ListSharesResponseDto() {
                this.items = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _items_initializers, void 0));
                this.total = __runInitializers(this, _total_initializers, void 0);
                this.limit = __runInitializers(this, _limit_initializers, void 0);
                this.offset = __runInitializers(this, _offset_initializers, void 0);
            }
            return ListSharesResponseDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _items_decorators = [(0, swagger_1.ApiProperty)({ type: [ShareInfoDto] }), (0, class_transformer_1.Type)(function () { return ShareInfoDto; })];
            _total_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsNumber)()];
            _limit_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsNumber)()];
            _offset_decorators = [(0, swagger_1.ApiProperty)(), (0, class_validator_1.IsNumber)()];
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _total_decorators, { kind: "field", name: "total", static: false, private: false, access: { has: function (obj) { return "total" in obj; }, get: function (obj) { return obj.total; }, set: function (obj, value) { obj.total = value; } }, metadata: _metadata }, _total_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _limit_decorators, { kind: "field", name: "limit", static: false, private: false, access: { has: function (obj) { return "limit" in obj; }, get: function (obj) { return obj.limit; }, set: function (obj, value) { obj.limit = value; } }, metadata: _metadata }, _limit_initializers, _instanceExtraInitializers);
            __esDecorate(null, null, _offset_decorators, { kind: "field", name: "offset", static: false, private: false, access: { has: function (obj) { return "offset" in obj; }, get: function (obj) { return obj.offset; }, set: function (obj, value) { obj.offset = value; } }, metadata: _metadata }, _offset_initializers, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ListSharesResponseDto = ListSharesResponseDto;
