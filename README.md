# tota_result_server

tota 앱의 결과를 넣는 서버...

외부에 비공개 되어 있음...

변경사항
===

# 19.01.06

eosjs@beta library를 사용. get_table_rows 함수에 reverse가 반영되지 않은 오류가 있으니 다음과 같이 수정해줄 것!

**eosjs-jsonrpc.js**

```
JsonRpc.prototype.get_table_rows = function (_a) {
    var _b = _a.json, json = _b === void 0 ? true : _b, code = _a.code, scope = _a.scope, table = _a.table, _c = _a.table_key, table_key = _c === void 0 ? "" : _c, _d = _a.lower_bound, lower_bound = _d === void 0 ? "" : _d, _e = _a.upper_bound, upper_bound = _e === void 0 ? "" : _e, _f = _a.index_position, index_position = _f === void 0 ? 1 : _f, _g = _a.key_type, key_type = _g === void 0 ? "" : _g, _h = _a.limit, limit = _h === void 0 ? 10 : _h, _i = _a.reverse, reverse = _i === void 0 ? false : _i;
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, this.fetch("/v1/chain/get_table_rows", {
                        json: json,
                        code: code,
                        scope: scope,
                        table: table,
                        table_key: table_key,
                        lower_bound: lower_bound,
                        upper_bound: upper_bound,
                        index_position: index_position,
                        key_type: key_type,
                        limit: limit,
                        reverse: reverse,
                    })];
                case 1: return [2 /*return*/, _j.sent()];
            }
        });
    });
};
```
