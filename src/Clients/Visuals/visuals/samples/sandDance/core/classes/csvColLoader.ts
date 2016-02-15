///-----------------------------------------------------------------------------------------------------------------
/// csvColLoader.ts.  Copyright (c) 2016 Microsoft Corporation.
///     - part of the beachParty library
///     - loads columns on demand from a raw block of CSV text.
///-----------------------------------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class CsvColLoaderClass
    {
        //---- private state ----
        _colNames = [];
        _processedHdr = false;
        _lastLoadRemainder = "";
        _colCount = 0;
        _rowCount = 0;
        _hasHeader: any = null;
        _sepChar = "";
        _quoteChar = "\"";
        _findTypes = false;
        _fixupValues = true;
        _text: string;
        //_rowIndexes: number[];          // indexes to start of each row (into _text)
        _colRowIndexes: number[][];       // array of rowIndexes for each column (points to start of col values for each row)
        _scanner: CsvScannerClass;

        _shortRowsCount = 0;

        constructor(text: string, hasHeader: boolean, sepChar: string, findTypes: boolean, fixupValues: boolean)
        {
            this._text = text;
            this._hasHeader = (hasHeader === null) ? false : hasHeader;
            this._findTypes = findTypes;
            this._sepChar = (sepChar === null) ? "\t" : sepChar;
            this._fixupValues = fixupValues;
        }

        /** load header and determine col types thru record sampling. */
        public buildDataFrameWithEmptyVectors()
        {
            var scanner = new CsvScannerClass(this._text, this._sepChar, "\"");
            this._scanner = scanner;

            //---- read first line containing column headers ----
            this.readHeaderRow(scanner);

            //---- read entire text to build rowIndexes[] ----
            this.buildColRowIndexes(scanner);

            //---- sample records to determine colTypes ----
            var colTypes = this.sampleForColTypes(scanner);
            
            //---- build a dataFrame with empty col vectors ----
            var vectorMap = <any>{};
            for (var i = 0; i < colTypes.length; i++)
            {
                var colName = this._colNames[i];
                vectorMap[colName] = null;
            }

            var dataFrame = new DataFrameClass(vectorMap, this._colNames, colTypes, this._rowCount);
            return dataFrame;
        }

        private readRowsWithVectors(scanner: CsvScannerClass, vectors: any[], startRow: number, rowCount: number)
        {
            var startOffset = this._colRowIndexes[0][startRow];
            scanner._offset = startOffset;

            for (var i = 0; i < rowCount; i++)
            {
                //---- process next row ----
                var valueCount = 0;

                for (var i = 0; i < this._colCount; i++)
                {
                    var vector = vectors[i];
                    var value = scanner.scan();

                    if (value === CsvScannerClass.endOfLine || value === CsvScannerClass.endOfFile)
                    {
                        break;
                    }

                    vector.push(value);
                    valueCount++;
                }

                //---- fill missing values ----
                while (valueCount < this._colCount)
                {
                    //---- add empty values for rest of the row ----
                    var vector = vectors[valueCount++];
                    vector.push("");
                }

                //---- skip extra values ----
                while (value !== CsvScannerClass.endOfLine && value !== CsvScannerClass.endOfFile)
                {
                    value = scanner.scan();
                }
 
                if (value === CsvScannerClass.endOfFile)
                {
                    break;
                }
            }
        }

        private fillSparseColVectors(vectorMap: any, scanner: CsvScannerClass, colIndexes: number[])
        {
            //---- process by vector (for now; todo: try processing by row later & compare timings) ----
            for (var i = 0; i < colIndexes.length; i++)
            {
                var colIndex = colIndexes[i];
                var colName = this._colNames[colIndex];
                var vector = [];
                vectorMap[colName] = vector;

                //---- fill colIndex ----
                for (var r = 0; r < this._rowCount; r++)
                {
                    var startIndex = this._colRowIndexes[colIndex][r];
                    var endIndex = this._colRowIndexes[colIndex + 1][r] - 1;

                    var value = this._text.substr(startIndex, endIndex - startIndex);

                    if (value.startsWith(this._quoteChar) && value.endsWith(this._quoteChar))
                    {
                        //---- remove surrounding quotes ----
                        value = value.substr(1, value.length - 2);
                    }

                    vector.push(value);
                }
            }
        }

        public getRecord(rowIndex: number, colNames: string[])
        {
            var startOffset = this._colRowIndexes[0][rowIndex];

            var scanner = this._scanner;
            scanner._offset = startOffset;

            var valueCount = 0;
            var record = <any>{};

            for (var i = 0; i < this._colCount; i++)
            {
                var value = scanner.scan();

                if (value === CsvScannerClass.endOfLine || value === CsvScannerClass.endOfFile)
                {
                    break;
                }

                var name = this._colNames[i];
                record[name] = value;

                valueCount++;
            }

            return record;
        }

        public loadColumns(vectorMap: any, colNames: string[])
        {
            var colIndexes = [];

            for (var i = 0; i < colNames.length; i++)
            {
                var colName = colNames[i];

                var index = this._colNames.indexOf(colName);
                if (index == -1)
                {
                    throw "loadColumns(): unknown colName=" + colName;
                }

                colIndexes.push(index);
            }

            this.fillSparseColVectors(vectorMap, this._scanner, colIndexes);
        }

        private sampleForColTypes(scanner)
        {
            //---- number of records to sample ----
            var topCount = 100;
            var middleCount = 100;
            var bottomCount = 100;

            var rowCount = this._rowCount;

            if (rowCount < 1000)
            {
                //---- just use all data ----
                topCount = rowCount;
                middleCount = 0;
                bottomCount = 0;
            }

            //---- build empty array of vectors ----
            var vectors = [];
            for (var i = 0; i < this._colCount; i++)
            {
                vectors[i] = [];
            }

            var topIndex = 0;
            var middleIndex = rowCount / 2 - middleCount / 2;
            var bottomIndex = rowCount - bottomCount;

            //---- pseudo random samples, in a way that is repeatable ----
            this.readRowsWithVectors(scanner, vectors, topIndex, topCount);
            this.readRowsWithVectors(scanner, vectors, middleIndex, middleCount);
            this.readRowsWithVectors(scanner, vectors, bottomIndex, bottomCount);

            //---- set colTypes from records[] ----
            var colTypes = [];

            for (var i = 0; i < this._colCount; i++)
            {
                var colName = this._colNames[i];
                //this.tryToConvertColToNativeType(records, colName);

                var vector = vectors[i];

                var colType = vp.data.getDataType(vector);
                colTypes.push(colType);
            }

            return colTypes;
        }

        private buildColRowIndexes(scanner: CsvScannerClass)
        {
            //---- build empty array of rowIndexes (one for each column) ----
            var colRowIndexes = <number[][]> [];
            this._colRowIndexes = colRowIndexes;

            //---- build 1 extra for finding end of last column on each row ----
            for (var i = 0; i <= this._colCount; i++)
            {
                var rowIndexes = <number[]> [];
                colRowIndexes.push(rowIndexes);
            }

            while (true)
            {
                //---- record start of next row ----
                var valueCount = 0;

                //---- process next row ----
                while (true)
                {
                    var startOffset = scanner._offset;

                    var value = scanner.scan();
                    if (value === CsvScannerClass.endOfLine || value === CsvScannerClass.endOfFile)
                    {
                        break;
                    }

                    var rowIndexes = colRowIndexes[valueCount];
                    rowIndexes.push(startOffset);
                    valueCount++;

                    if (valueCount == this._colCount)
                    {
                        //---- add end of last column info ----
                        var rowIndexes = colRowIndexes[valueCount];

                        var offset = scanner._offset;
                        if (! scanner.justPassedDelimiter())
                        {
                            offset++;
                        }
                        rowIndexes.push(offset);
                    }
                }

                if (value === CsvScannerClass.endOfFile)
                {
                    break;
                }
            }

            this._rowCount = colRowIndexes[0].length;
        }

        private readHeaderRow(scanner: CsvScannerClass)
        {
            var colNum = 0;
            this._colNames = [];

            while (true)
            {
                var colName = scanner.scan();
                if (colName === CsvScannerClass.endOfLine || colName === CsvScannerClass.endOfFile)
                {
                    break;
                }

                if (this._hasHeader)
                {
                    // Check that the column name doesn't contain any invalid chars [that JavaSctipt - or we - may choke on]
                    //if (colName.startsWith("@") || (colName.indexOf("&") != -1))
                    //{
                    //    throw ("Column name '" + colName + "' is invalid: column names cannot contain '&' or start with '@'");
                    //}
                    colName = colName.trim();
                }
                else
                {
                    colName = "column" + (colNum + 1);
                }

                this._colNames.push(colName);
            }

            this._colCount = this._colNames.length;

            if (!this._hasHeader)
            {
                //---- reset scanner to first row ----
                scanner = new CsvScannerClass(this._text, this._sepChar, "\"");
            }
        }
    }
} 