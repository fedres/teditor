/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports", "vs/base/common/errors", "./foldingRanges"], function (require, exports, errors_1, foldingRanges_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sanitizeRanges = exports.RangesCollector = exports.SyntaxRangeProvider = exports.ID_SYNTAX_PROVIDER = void 0;
    const MAX_FOLDING_REGIONS = 5000;
    const foldingContext = {};
    exports.ID_SYNTAX_PROVIDER = 'syntax';
    class SyntaxRangeProvider {
        constructor(editorModel, providers, limit = MAX_FOLDING_REGIONS) {
            this.editorModel = editorModel;
            this.providers = providers;
            this.limit = limit;
            this.id = exports.ID_SYNTAX_PROVIDER;
        }
        compute(cancellationToken) {
            return collectSyntaxRanges(this.providers, this.editorModel, cancellationToken).then(ranges => {
                if (ranges) {
                    let res = sanitizeRanges(ranges, this.limit);
                    return res;
                }
                return null;
            });
        }
        dispose() {
        }
    }
    exports.SyntaxRangeProvider = SyntaxRangeProvider;
    function collectSyntaxRanges(providers, model, cancellationToken) {
        let rangeData = null;
        let promises = providers.map((provider, i) => {
            return Promise.resolve(provider.provideFoldingRanges(model, foldingContext, cancellationToken)).then(ranges => {
                if (cancellationToken.isCancellationRequested) {
                    return;
                }
                if (Array.isArray(ranges)) {
                    if (!Array.isArray(rangeData)) {
                        rangeData = [];
                    }
                    let nLines = model.getLineCount();
                    for (let r of ranges) {
                        if (r.start > 0 && r.end > r.start && r.end <= nLines) {
                            rangeData.push({ start: r.start, end: r.end, rank: i, kind: r.kind });
                        }
                    }
                }
            }, errors_1.onUnexpectedExternalError);
        });
        return Promise.all(promises).then(_ => {
            return rangeData;
        });
    }
    class RangesCollector {
        constructor(foldingRangesLimit) {
            this._startIndexes = [];
            this._endIndexes = [];
            this._nestingLevels = [];
            this._nestingLevelCounts = [];
            this._types = [];
            this._length = 0;
            this._foldingRangesLimit = foldingRangesLimit;
        }
        add(startLineNumber, endLineNumber, type, nestingLevel) {
            if (startLineNumber > foldingRanges_1.MAX_LINE_NUMBER || endLineNumber > foldingRanges_1.MAX_LINE_NUMBER) {
                return;
            }
            let index = this._length;
            this._startIndexes[index] = startLineNumber;
            this._endIndexes[index] = endLineNumber;
            this._nestingLevels[index] = nestingLevel;
            this._types[index] = type;
            this._length++;
            if (nestingLevel < 30) {
                this._nestingLevelCounts[nestingLevel] = (this._nestingLevelCounts[nestingLevel] || 0) + 1;
            }
        }
        toIndentRanges() {
            if (this._length <= this._foldingRangesLimit) {
                let startIndexes = new Uint32Array(this._length);
                let endIndexes = new Uint32Array(this._length);
                for (let i = 0; i < this._length; i++) {
                    startIndexes[i] = this._startIndexes[i];
                    endIndexes[i] = this._endIndexes[i];
                }
                return new foldingRanges_1.FoldingRegions(startIndexes, endIndexes, this._types);
            }
            else {
                let entries = 0;
                let maxLevel = this._nestingLevelCounts.length;
                for (let i = 0; i < this._nestingLevelCounts.length; i++) {
                    let n = this._nestingLevelCounts[i];
                    if (n) {
                        if (n + entries > this._foldingRangesLimit) {
                            maxLevel = i;
                            break;
                        }
                        entries += n;
                    }
                }
                let startIndexes = new Uint32Array(this._foldingRangesLimit);
                let endIndexes = new Uint32Array(this._foldingRangesLimit);
                let types = [];
                for (let i = 0, k = 0; i < this._length; i++) {
                    let level = this._nestingLevels[i];
                    if (level < maxLevel || (level === maxLevel && entries++ < this._foldingRangesLimit)) {
                        startIndexes[k] = this._startIndexes[i];
                        endIndexes[k] = this._endIndexes[i];
                        types[k] = this._types[i];
                        k++;
                    }
                }
                return new foldingRanges_1.FoldingRegions(startIndexes, endIndexes, types);
            }
        }
    }
    exports.RangesCollector = RangesCollector;
    function sanitizeRanges(rangeData, limit) {
        let sorted = rangeData.sort((d1, d2) => {
            let diff = d1.start - d2.start;
            if (diff === 0) {
                diff = d1.rank - d2.rank;
            }
            return diff;
        });
        let collector = new RangesCollector(limit);
        let top = undefined;
        let previous = [];
        for (let entry of sorted) {
            if (!top) {
                top = entry;
                collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
            }
            else {
                if (entry.start > top.start) {
                    if (entry.end <= top.end) {
                        previous.push(top);
                        top = entry;
                        collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
                    }
                    else {
                        if (entry.start > top.end) {
                            do {
                                top = previous.pop();
                            } while (top && entry.start > top.end);
                            if (top) {
                                previous.push(top);
                            }
                            top = entry;
                        }
                        collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
                    }
                }
            }
        }
        return collector.toIndentRanges();
    }
    exports.sanitizeRanges = sanitizeRanges;
});
//# __sourceMappingURL=syntaxRangeProvider.js.map