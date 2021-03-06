/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports", "vs/editor/common/core/range", "vs/editor/common/core/selection"], function (require, exports, range_1, selection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CopyLinesCommand = void 0;
    class CopyLinesCommand {
        constructor(selection, isCopyingDown) {
            this._selection = selection;
            this._isCopyingDown = isCopyingDown;
            this._selectionDirection = 0 /* LTR */;
            this._selectionId = null;
            this._startLineNumberDelta = 0;
            this._endLineNumberDelta = 0;
        }
        getEditOperations(model, builder) {
            let s = this._selection;
            this._startLineNumberDelta = 0;
            this._endLineNumberDelta = 0;
            if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
                this._endLineNumberDelta = 1;
                s = s.setEndPosition(s.endLineNumber - 1, model.getLineMaxColumn(s.endLineNumber - 1));
            }
            let sourceLines = [];
            for (let i = s.startLineNumber; i <= s.endLineNumber; i++) {
                sourceLines.push(model.getLineContent(i));
            }
            const sourceText = sourceLines.join('\n');
            if (sourceText === '') {
                // Duplicating empty line
                if (this._isCopyingDown) {
                    this._startLineNumberDelta++;
                    this._endLineNumberDelta++;
                }
            }
            if (!this._isCopyingDown) {
                builder.addEditOperation(new range_1.Range(s.endLineNumber, model.getLineMaxColumn(s.endLineNumber), s.endLineNumber, model.getLineMaxColumn(s.endLineNumber)), '\n' + sourceText);
            }
            else {
                builder.addEditOperation(new range_1.Range(s.startLineNumber, 1, s.startLineNumber, 1), sourceText + '\n');
            }
            this._selectionId = builder.trackSelection(s);
            this._selectionDirection = this._selection.getDirection();
        }
        computeCursorState(model, helper) {
            let result = helper.getTrackedSelection(this._selectionId);
            if (this._startLineNumberDelta !== 0 || this._endLineNumberDelta !== 0) {
                let startLineNumber = result.startLineNumber;
                let startColumn = result.startColumn;
                let endLineNumber = result.endLineNumber;
                let endColumn = result.endColumn;
                if (this._startLineNumberDelta !== 0) {
                    startLineNumber = startLineNumber + this._startLineNumberDelta;
                    startColumn = 1;
                }
                if (this._endLineNumberDelta !== 0) {
                    endLineNumber = endLineNumber + this._endLineNumberDelta;
                    endColumn = 1;
                }
                result = selection_1.Selection.createWithDirection(startLineNumber, startColumn, endLineNumber, endColumn, this._selectionDirection);
            }
            return result;
        }
    }
    exports.CopyLinesCommand = CopyLinesCommand;
});
//# __sourceMappingURL=copyLinesCommand.js.map