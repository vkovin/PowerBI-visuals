///-----------------------------------------------------------------------------------------------------------------
/// fileAccess.ts.  Copyright (c) 2016 Microsoft Corporation.
///     Part of the beachParty library - functions to read and write files.
///-----------------------------------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export enum fileFormat
    {
        text,
        json,
        csv,
        odata,
        excelSheet,
        excelAllSheets,
        // sql,
    }

    export interface CsvFormatOptions 
    {
        hasHeader: boolean;
        sepChar: string;
        findTypes: boolean;
    }

    export class FileAccess
    {
        /** reads a local text file that is selected by the user. */
        public static readLocalTextFile(userPrompt: string, callback)
        {
            //---- add an file input elem so we can promp user for file ----
            var fileElem = document.createElement("input");
            fileElem.setAttribute("type", "file");
            fileElem.style.display = "none";

            //fileElem.setAttribute("name", "buildNum.txt");
            //fileElem.setAttribute("type", "text/*");
            //fileElem.setAttribute("value", "myValue");

            document.body.appendChild(fileElem);

            //---- click on it to invoke the dialog ----
            fileElem.click();

            //---- remove the fileElem ----
            document.body.removeChild(fileElem);

            //---- now, initiate the async read ----
            var reader = new FileReader();
            reader.onload = function (f)
            {
                callback(reader.result);
            };

            var started = false;

            if (fileElem.files.length)
            {
                var file = fileElem.files[0];
                reader.readAsText(file);
                started = true;
            }

            return started;
        }

        public static mapToUrlParams(map)
        {
            var str = "";

            if (map)
            {
                for (var key in map)
                {
                    if (str === "")
                    {
                        str = "?";
                    }
                    else
                    {
                        str += "&";
                    }

                    str += key + "=" + map[key];
                }
            }

            return str;
        }

        public static writeFile64(fn: string, content64: string)
        {
            var vp = bpServerPath();
            var serviceUrl = vp + "/putData.asmx/writeFile64";

            var fullUrl = serviceUrl;
            var finalUrl = encodeURI(fullUrl);

            //alert("posting to url: " + finalUrl);

            var body = "fn=" + fn + "&content=" + content64;

            FileAccess.httpPost(finalUrl, body, function (xmlhttp)
            {
                //alert("writeFile64 succeeded");
            },
                function (e)
                {
                    //alert("writeFile64 failed");
                }, false);
        }

        public static writeFileText(fn: string, text: string, successCallback?: any, failureCallback?: any)
        {
            var vp = bpServerPath();
            var serviceUrl = vp + "/putData.asmx/writeFileText";

            var fullUrl = serviceUrl;
            var finalUrl = encodeURI(fullUrl);

            //alert("posting to url: " + finalUrl);

            var body = "fn=" + fn + "&text=" + encodeURIComponent(text);
            var isAsync = (successCallback !== undefined);

            FileAccess.httpPost(finalUrl, body,
                function (xmlhttp)
                {
                    if (successCallback)
                    {
                        successCallback(xmlhttp);
                    }
                },
                function (e)
                {
                    if (failureCallback)
                    {
                        failureCallback(e);
                    }
                }, isAsync);
        }

        public static removeDirectory(dir: string)
        {
            var vp = bpServerPath();
            var serviceUrl = vp + "/putData.asmx/removeDirectory";

            var fullUrl = serviceUrl;
            var finalUrl = encodeURI(fullUrl);

            //alert("posting to url: " + finalUrl);

            var body = "dir=" + dir;

            FileAccess.httpPost(finalUrl, body, function (xmlhttp)
            {
                //alert("writeFile64 succeeded");
            },
                function (e)
                {
                    //alert("writeFile64 failed");
                }, false);
        }

        /** replace every /Date/ value with a javaScript date object. */
        public static fixUpDatesFromDotNet(data: any)
        {
            var keys = null;

            if (data.length)
            {
                //---- JSON array of records ----
                for (var r = 0; r < data.length; r++)
                {
                    var record = data[r];

                    if (!keys)
                    {
                        keys = vp.utils.keys(record);
                    }

                    for (var k = 0; k < keys.length; k++)
                    {
                        var colName = keys[k];
                        var value = record[colName];

                        if (vp.utils.isString(value))
                        {
                            var str = <string>value;
                            if (str.startsWith("/Date("))
                            {
                                str = "new " + str.substr(1, str.length - 2);
                                var date = new Date(str);       
                                record[colName] = date;
                            }
                        }
                    }

                }
            }
            else if (data._vectorsByName)
            {
                //---- DATA FRAME class ----
                var df = <DataFrameClass>data;

                //---- process by vector ----
                var names = df.getNames();

                for (var v = 0; v < names.length; v++)
                {
                    var name = names[v];
                    var vector = df.getVector(name, true);

                    for (var r = 0; r < vector.length; r++)
                    {
                        var value = vector[r];

                        if (vp.utils.isString(value))
                        {
                            var str = <string>value;
                            if (str.startsWith("/Date("))
                            {
                                str = "new " + str.substr(1, str.length - 2);
                                var date = new Date(str);      
                                vector[r] = date;
                            }
                        }
                    }
                }
            }
            else if (data)
            {
                //---- KEY/VECTOR dict ----
                var names = vp.utils.keys(data);

                for (var v = 0; v < names.length; v++)
                {
                    var name = names[v];
                    var vector = <any[]> data[name];

                    for (var r = 0; r < vector.length; r++)
                    {
                        var value = vector[r];

                        if (vp.utils.isString(value))
                        {
                            var str = <string>value;
                            if (str.startsWith("/Date("))
                            {
                                str = "new " + str.substr(1, str.length - 2);
                                var date = new Date(str);      
                                vector[r] = date;
                            }
                        }
                    }
                }
            }

            return data;
        }

        /** read TEXT file sync. from server relative path. */
        public static readServerTextFile(relPath: string)
        {
            //---- read file SYNC from my host (same directory) ----
            var request = new XMLHttpRequest();

            //---- try to disable caching here by using time as a unique URL argument ----
            request.open("GET", relPath + "?foo=" + Date.now(), false);

            request.send();
            var str = request.responseText;
            return str;
        }

        /** read binary file sync. from server relative path, into arrayBuff. */
        public static readServerFileIntoArrayBuff(relPath: string)
        {
            var request = new XMLHttpRequest();
            request.open("GET", relPath, false);
            request.responseType = 'arraybuffer';

            request.send();
            var uInt8Array = new Uint8Array(request.response); 
            return uInt8Array;
        }

        public static readFile(fnOrUlr: string, format?: fileFormat, formatOptions?: any,
            asyncSuccessCallback?: any, asyncFailCallback?: any, noCache?: boolean, asDataFrame?: boolean, addDataPathIfNeeded = true)
        {
            //vp.utils.debug("readFile() called");

            format = format || fileFormat.text;        // default to TEXT
            var isJson = ((format === fileFormat.json) || (format === fileFormat.odata));

            if (addDataPathIfNeeded && !fnOrUlr.contains(":"))
            {
                fnOrUlr = bpDataPath() + "/" + fnOrUlr;
            }

            var result = undefined;

            if (format === fileFormat.csv)
            {
                
                var sourceData = ``;
                
                var data = FileAccess.fixUpDatesFromDotNet(sourceData);
                        asyncSuccessCallback(data);

                // fileAccess.httpReadCsvViaService(fnOrUlr, formatOptions, function (data)
                // {
                //     //---- success ----
                //     if (asyncSuccessCallback)
                //     {
                //         var data = fileAccess.fixUpDatesFromDotNet(data);
                //         asyncSuccessCallback(data);
                //     }
                //     else
                //     {
                //         result = data;
                //     }
                // },
                //     function (e)
                //     {
                //         if (asyncFailCallback)
                //         {
                //             asyncFailCallback(e);
                //         }
                //         else
                //         {
                //             //---- FAILURE ----
                //             fileFail("httpReadCsvViaService", fnOrUlr, e);
                //         }
                //     },
                //     (asyncSuccessCallback != null), asDataFrame);
            }
            else if (format === fileFormat.excelSheet || format === fileFormat.excelAllSheets)
            {
                // fileAccess.httpReadExcelViaService(fnOrUlr, format, <string>formatOptions,
                //     function (data)
                //     {
                //         //---- success ----
                //         if (asyncSuccessCallback)
                //         {
                //             var data = fileAccess.fixUpDatesFromDotNet(data);
                //             asyncSuccessCallback(data);
                //         }
                //         else
                //         {
                //             result = data;
                //         }
                //     },
                //     function (e)
                //     {
                //         //---- failure ----
                //         if (asyncFailCallback)
                //         {
                //             asyncFailCallback(e);
                //         }
                //         else
                //         {
                //             //throw "Error during httpReadCsvViaService: url=" + fnOrUlr + ", error=" + e.response;
                //             fileFail("httpReadCsvViaService", fnOrUlr, e);
                //         }
                //     },
                //     (asyncSuccessCallback != null));
            }
            else
            {
                FileAccess.httpReadViaService(fnOrUlr, isJson, function (data)
                {
                    //---- success ----
                    if (format === fileFormat.odata)
                    {
                        data = data.results;
                    }

                    //---- sending from server encodes special characters, so we must decode them ----
                    data = FileAccess.removeHtmlEncoding(data);

                    //else if (format === fileFormat.csv)
                    //{
                    //    var start = vp.utils.now();

                    //    var csv = createCsvLoader(formatOptions.hasHeader, formatOptions.sepChar,
                    //        formatOptions.findTypes);

                    //    data = csv.load(data, false);

                    //    var data = fileAccess.fixUpDatesFromDotNet(data);

                    //    var elapsed = vp.utils.now() - start;
                    //    vp.utils.debug("csvLoader.load: " + elapsed + " ms");
                    //}

                    if (asDataFrame)
                    {
                        data = DataFrameClass.jsonToDataFrame(data);
                    }

                    if (asyncSuccessCallback)
                    {
                        asyncSuccessCallback(data);
                    }
                    else
                    {
                        result = data;
                    }

                },

                    function (e)
                    {
                        if (asyncFailCallback)
                        {
                            asyncFailCallback(e);
                        }
                        else
                        {
                            //---- failure ----
                            //throw "Error during httpReadCsvViaService: url=" + fnOrUlr + ", error=" + e.response;
                            fileFail("httpReadCsvViaService", fnOrUlr, e);
                        }
                    },
                    (asyncSuccessCallback != null), noCache);
            }

            return result;
        }

        //---- this seems to be the best way to remove HTML encodings from a string (might compress spaces though) ----
        public static removeHtmlEncoding(value: string)
        {
            var div = document.createElement("div");
            div.innerHTML = value;

            var str = div.textContent;
            return str;
        }

        public static readSqlTable(cs: string, tableName: string, query: string, maxRecords: number,
            asyncSuccessCallback?: any, asyncFailCallback?: any)
        {
            var bpServer = bpServerPath();
            var serviceUrl = bpServer + "/getData.asmx/DownloadDataFromSql";

            var fullUrl = serviceUrl + "?cs=" + cs + "&tableName=" + tableName + "&query=" + query + "&maxRecords=" +
                maxRecords;

            var finalUrl = encodeURI(fullUrl);

            var isJson = true;
            httpRead(finalUrl, isJson, function (xmlhttp)
            {
                if (asyncSuccessCallback)
                {
                    var data = getDataFromResult(xmlhttp, isJson);

                    ////---- convert into a real dataFrame object ----
                    //var df = new dataFrameClass(data.names, data.vectors);

                    data = FileAccess.fixUpDatesFromDotNet(data);

                    asyncSuccessCallback(data);
                }
            },
            asyncFailCallback, true);
        }

        static httpReadIncremental(url, isJson, offset, maxSize, successFunc, failFunc, callAsync?)
        {
            var pp = pagePath();

            if (url.startsWith(".."))
            {
                url = pp + url;
            }

            //var serviceUrl = "http://" + window.location.host + "/VuePlotWeb/Service/Service1.asmx/DownloadText";
            var serviceUrl = pp + "/Service/Service1.asmx/IncrementalDownload";

            var win: any = window;

            if (win.alertShown === undefined || win.alertShown === null)
            {
                //alert("read via url: " + serviceUrl);
                win.alertShown = 1;
            }

            var fullUrl = serviceUrl + "?url=" + url + "&offset=" + offset + "&maxSize=" + maxSize;

            httpRead(fullUrl, false, function (xmlhttp)
            {
                if (successFunc)
                {
                    var data = getDataFromResult(xmlhttp, isJson);

                    successFunc(data);
                }
            },
                failFunc);
        }

        /// starts a async (or calls sync) upload of text to the specified url.
        static httpPost(url, stringToSend, successFunc, failFunc?: any, isAsync?: boolean, contentType?: string)
        {
            var xmlhttp = createXMLHttpRequest();
            xmlhttp.open("POST", url, isAsync);

            if (!contentType)
            {
                contentType = "application/x-www-form-urlencoded";
            }

            xmlhttp.setRequestHeader("Content-Type", contentType);

            xmlhttp.onreadystatechange = function ()
            {
                if ((xmlhttp.readyState === 4) && (xmlhttp.status !== 0))
                {
                    if (xmlhttp.status === 200)
                    {
                        if (successFunc != null)
                        {
                            successFunc(xmlhttp);
                        }
                    }
                    else
                    {
                        if (failFunc != null)
                        {
                            failFunc(xmlhttp);
                        }
                    }
                }
            };

            xmlhttp.send(stringToSend);
        }

        ///
        /// download text data from a URL, using a specific service that is expected to
        /// be on the same host as the current host:  http://samehostname/VuePlotWeb/Service/Service1.asmx/DownloadText
        ///
        /// This is to get around problem "cross origin resource sharing".
        ///
        static httpReadViaService(url: string, isJson: boolean, successFunc: any, failFunc?: any, isAsync?: boolean, noCache?: boolean)
        {
            isJson = isJson || false;
            noCache = noCache || false;

            var win: any = window;
            if (win.alertShown === undefined || win.alertShown === null)
            {
                //alert("read via url: " + serviceUrl);
                win.alertShown = 1;
            }

            successFunc({
                "State": ["NY"],
                "Name": ["Hello World!"]
            });

//             httpRead(finalUrl, httpReadJson, function (xmlhttp)
//             {
//                 if (successFunc)
//                 {
//                     var data = getDataFromResult(xmlhttp, isJson, true);
// 
//                     successFunc(data);
//                 }
//             },
//                 failFunc, isAsync, noCache);
        }

        ///
        /// download CSV data (as JSON data) from a URL, using a specific service that is expected to
        /// be on the same host as the current host:  http://samehostname/VuePlotWeb/Service/Service1.asmx/DownloadCsvAsJson
        ///
        /// This is to get around problem "cross origin resource sharing".
        ///
        static httpReadCsvViaService(url: string, csvOpts: CsvFormatOptions, successFunc, failFunc?, isAsync?: boolean, asDataFrame = false)
        {
            var vp = bpServerPath();
            var serviceUrl = vp + "/getData.asmx/DownloadCsvAsJsonVectors";

            var win: any = window;
            if (win.alertShown === undefined || win.alertShown === null)
            {
                //alert("read via url: " + serviceUrl);
                win.alertShown = 1;
            }

            var fullUrl = serviceUrl + "?url=" + url + "&delimeter=" + csvOpts.sepChar +
                "&hasHeader=" + csvOpts.hasHeader + "&inferTypes=" + csvOpts.findTypes;

            var finalUrl = encodeURI(fullUrl);

            var isJson = true;
            httpRead(finalUrl, isJson, function (xmlhttp)
            {
                if (successFunc)
                {
                    var data = getDataFromResult(xmlhttp, isJson);

                    if (asDataFrame)
                    {
                        //---- convert into a real dataFrame object ----
                        var df = new DataFrameClass(data.names, data.vectors);
                        data = df;
                    }

                    data = FileAccess.fixUpDatesFromDotNet(data);

                    successFunc(data);
                }
            },
                failFunc, isAsync);
        }

        ///
        /// download Excel data (as JSON data) from a URL, using a specific service that is expected to
        /// be on the same host as the current host:  http://samehostname/VuePlotWeb/Service/Service1.asmx/DownloadExcelAsJson
        ///
        /// This is to get around problem "cross origin resource sharing".
        ///
        static httpReadExcelViaService(url: string, format: fileFormat, sheetName: string, successFunc, failFunc?, isAsync?)
        {
            var vp = bpServerPath();

            if (format === fileFormat.excelSheet)
            {
                var serviceUrl = vp + "/getData.asmx/DownloadExcelSheetAsJson";
                var fullUrl = serviceUrl + "?url=" + url + "&sheetName=" + sheetName;
            }
            else
            {
                var serviceUrl = vp + "/getData.asmx/DownloadAllExcelSheetsAsJson";
                var fullUrl = serviceUrl + "?url=" + url;
            }

            var win: any = window;
            if (win.alertShown === undefined || win.alertShown === null)
            {
                //alert("read via url: " + serviceUrl);
                win.alertShown = 1;
            }

            var finalUrl = encodeURI(fullUrl);

            var isJson = true;
            httpRead(finalUrl, isJson, function (xmlhttp)
            {
                if (successFunc)
                {
                    var data = getDataFromResult(xmlhttp, isJson);

                    successFunc(data);
                }
            },
                failFunc, isAsync);
        }

        /// reads OData data from the specified url.
        static oDataRead(url, isJson, successFunc, failFunc)
        {
            FileAccess.httpReadViaService(url, isJson, function (data)
            {
                if (successFunc)
                {
                    if ((data) && (data.results))
                    {
                        data = data.results;
                    }

                    successFunc(data);
                }
            }, failFunc);
        }

        //---- we use this to store data for multiple calls to oDataReadAll ----
        static oDataBag: any = {};

        /// reads all of the OData data from the specified url (adding parameters to the URL to
        /// read each block of data).
        static oDataReadAll(url, byCount, successFunc, failFunc)
        {
            if (byCount == null)
            {
                byCount = 1000;
            }

            var bag = FileAccess.oDataBag;
            bag.error = false;
            bag.data = [];
            bag.total = 0;
            bag.byCount = byCount;

            var readMore = function ()
            {
                FileAccess.oDataRead(url + "?$skip=" + bag.total + "&$top=" + bag.byCount, true,

                    function (dataChunk)     // success func
                    {
                        var chunkSize = dataChunk.length;
                        if (chunkSize > 0)
                        {
                            bag.byCount = chunkSize;

                            //self.dataServices.concat(dataChunk);
                            //bag.data = dataServices.conconcat(bag.data, dataChunk);

                            bag.total = bag.data.length;

                            readMore();
                        }
                        else
                        {
                            if (successFunc != null)
                            {
                                successFunc(bag.data);
                            }
                        }
                    },

                    function (xmlhttp)      // failure func
                    {
                        if (failFunc != null)
                        {
                            failFunc(xmlhttp);
                        }

                        bag.error = true;
                    }
                    );
            };

            readMore();
        }

    }

    export class IncrementalCsvLoader
    {
        _csvLoader = null;
        _offset = 0;
        _recordsCallback = null;
        _url = null;

        constructor(url, hasHeader, sepChar, findTypes, recordsCallback)
        {
            this._recordsCallback = recordsCallback;
            this._url = url;

            this._csvLoader = createCsvLoader(hasHeader, sepChar, findTypes);
        }

        public readNextCheck(size)
        {
            FileAccess.httpReadIncremental(this._url, false, this._offset, size, function (jsonResult)
            {
                //---- success: got next chunk ----
                var chunk = jsonResult.data;
                var isMore = jsonResult.isMore;

                this._offset += chunk.length;

                var records = this._csvLoader.load(chunk, true);
                this._recordsCallback(records, isMore);
            }, function (xmlhttp)
                {
                    //---- read failed ----
                    throw "Error reading CSV file: " + this._url;
                });
        }
    }

    export function pagePath()
    {
        var pp = window.location.href;

        //---- on IE10, running under "localhost", sometimes all the props of "window.location" are ----
        //---- undefined, so we ahndle that here ----
        if (pp === undefined || pp === null)
        {
            pp = window.location.toString();
        }

        var index = pp.lastIndexOf("/");
        if (index > 0)
        {
            pp = pp.substr(0, index);
            index = pp.lastIndexOf("/");
            if (index > 0)
            {
                pp = pp.substr(0, index);
            }
        }

        return pp;
    }

    /// starts a async download of text from the specified url.  if "isJson" is true,
    /// the data is requested in json format.  when the download is finished, either
    /// successFunc or failFunc is called, with the param "xmlhttp".
    ///
    /// if this is a file on a server, the true text is returned in xmlhttp.responseText.  if text is XML,
    /// the XML document object is available in xmlhttp.responseXML.
    export function httpRead(url: string, isJson: boolean, successFunc, failFunc, callAsync?: boolean, noCache?: boolean)
    {
        callAsync = (callAsync === undefined || callAsync === null) ? true : callAsync;

        var xmlhttp = vp.utils.createXMLHttpRequest();
        xmlhttp.open("GET", url, callAsync);

        if (isJson)
        {
            xmlhttp.setRequestHeader("accept", "application/json");
        }

        if (noCache)
        {
            xmlhttp.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");
        }

        xmlhttp.onreadystatechange = function ()
        {
            if ((xmlhttp.readyState === 4) && (xmlhttp.status !== 0))
            {
                if (xmlhttp.status === 200)
                {
                    if (successFunc != null)
                    {
                        successFunc(xmlhttp);
                    }
                }
                else
                {
                    if (failFunc != null)
                    {
                        failFunc(xmlhttp);
                    }
                    else
                    {
                        throw "httpRead failed: url=" + url;
                    }
                }
            }
        };

        xmlhttp.send();
    }

    export function getMyPath()
    {
        // if (AppMgrClass.current && AppMgrClass.current._beachPartyDir)
        // {
        //     var path = <string>AppMgrClass.current._beachPartyDir + "/Apps";
        // }
        // else
        // {
            var path = window.location.href;

            //---- remove any params ----
            var index = path.indexOf("?");
            if (index > -1)
            {
                path = path.substr(0, index);
            }

            //---- remove the last node ----
            var index = path.lastIndexOf("/");
            if (index > -1)
            {
                path = path.substr(0, index);
            }
        // }

        return path;
    }

    function pathHelper(nodeName)
    {
        var getServicePrefix = true;
        var serverPath = window.location.href;

        //---- try easy ones first ----
        if (serverPath.startsWith("http://localhost"))
        {
            serverPath = "http://localhost/" + nodeName;
        }
        else if (serverPath.contains("azurewebsites"))
        {
            serverPath = location.protocol + "//" + location.hostname + "/" + nodeName;
        }
        else
        {
            //---- first, remove any parameters ----
            var index = serverPath.indexOf("?");
            if (index > -1)
            {
                serverPath = serverPath.substr(0, index);
            }

            //---- find node that begins with "/build" ----
            index = serverPath.indexOf("/build");
            if (index > 0)
            {
                var index2 = serverPath.indexOf("/", index + 1);
                if (index2 > -1)
                {
                    serverPath = serverPath.substr(0, index2);
                    serverPath += "/" + nodeName;
                }
            }
        }

        return serverPath;
    }

    export function bpServerPath()
    {
        ////---- on IE10, running under "localhost", sometimes all the props of "window.location" are ----
        ////---- undefined, so we handle that here ----

        //---- the GOAL of this function: to return the "bpServer" name that belongs to this code.  This is easy ----
        //---- for dev machine (http://localhost/bpServer) but gets somewhat tricky when we are deployed ----
        //---- and the bpServer we want is something like:  http://vibe10/SandCastle/build3/bpServer.  ----

        //var serverPath = window.location.href;

        if (location.href.contains("azurewebsites"))
        {
            var path = location.protocol + "//beachPartyServer.azurewebsites.net";
        }
        else
        {
            var path = pathHelper("bpServer");
        }

        return path;
    }

    export function appPath()
    {
        ////---- on IE10, running under "localhost", sometimes all the props of "window.location" are ----
        ////---- undefined, so we handle that here ----

        //---- the GOAL of this function: to return the "bpServer" name that belongs to this code.  This is easy ----
        //---- for dev machine (http://localhost/bpServer) but gets somewhat tricky when we are deployed ----
        //---- and the bpServer we want is something like:  http://vibe10/SandCastle/build3/bpServer.  ----

        // if (AppMgrClass.current && AppMgrClass.current._beachPartyDir)
        // {
        //     var path = <string>AppMgrClass.current._beachPartyDir;
        // }
        // else
        // {
            var path = pathHelper("beachPartyApp");
        // } 

        return path; 
    }

    function getMyProtocol()
    {
        var protocol = (location.protocol) ? location.protocol : "http:";
        return protocol;
    }

    export function bpDataPath()
    {
        //return pathHelper("VueBigData");
        var hostName = (window.location.hostname) ? window.location.hostname : "localhost";

        //---- HTTP / HTTPS ----
        var dataPath = getMyProtocol();

        if (hostName.contains("azurewebsites"))
        {
            dataPath += "//beachpartyserver.azurewebsites.net/VueBigData";
            //dataPath += "//" + hostName + "/bpServer/VueBigData";
        }
        else
        {
            dataPath += "//" + hostName + "/VueBigData";
        }

        return dataPath;
    }

    /// create a instance of the XMLHttpRequest object.
    export function createXMLHttpRequest()
    {
        var req = null;

        if (XMLHttpRequest != null)
        {
            req = new XMLHttpRequest();
        }
        else
        {
            req = new ActiveXObject("Microsoft.XMLHTTP");
        }

        return req;
    }

    /// convert a XmlHttp response to a json object.
    export function getDataFromResult(xmlRequest: XMLHttpRequest, isJson: boolean, decodeNeeded?: boolean)
    {
        //---- try not to use the "responseXML" since it is heavy weight ----
        var data: any = xmlRequest.response;        // on my server, value is here
        if (!data)
        {
            data = xmlRequest.responseText;         // on vibe10, value is here.  why?
        }

        if (data)
        {
            if (data.startsWith("<?xml"))
            {
                var index = data.indexOf(">");
                if (index > -1)
                {
                    var index2 = data.indexOf(">", index + 1);
                    if (index2 > -1)
                    {
                        //---- remove the XML header ----
                        data = data.substr(index2 + 1);

                        //---- remove the xml trailer ----
                        if (data.endsWith("</string>"))
                        {
                            data = data.substr(0, data.length - 9);
                        }
                    }
                }
            }
            //var responseXML: any = xmlRequest.responseXML;

            //var node = responseXML.lastChild;
            //if (node)
            //{
            //    data = (node.text) ? node.text : node.textContent;
            //}

            //---- convert from XML string to the actual value we want ----
        }

        ////---- TOGROK: what is this needed? ----
        //if (decodeNeeded)
        //{
        //    data = decodeURIComponent(data);
        //    data = decodeURIComponent(data);
        //}

        if ((data) && (isJson))
        {
            vp.utils.debug("getDataFromResult: json.length=" + vp.formatters.comma(data.length));

            var data = JSON.parse(data);
            if ((data) && (data.d))
            {
                data = data.d;      // for json data
            }
        }

        return data;
    }

    export function startServerSort(keys: string[], sortAsNumbers: boolean, callback)
    {
        var jsonData = JSON.stringify(keys);
        var safeJsonData = encodeURIComponent(jsonData);         // protect ourselves from "=" and "&" chars in keys

        var body = "sortAsNumbers=" + sortAsNumbers + "&keys=" + safeJsonData;

        var url = bpServerPath() + "/putData.asmx/sortKeys";
        var safeUrl = encodeURI(url);

        FileAccess.httpPost(safeUrl, body, function (xmlhttp)
        {
            //---- SUCCESS ----
            var data = getDataFromResult(xmlhttp, true);
            callback(data);
        },
            function (e)
            {
                //alert("writeFile64 failed");
            }, false);
    }

    export function logActionToServer(sessionId: string, gesture: string, elementId: string, elementType: string,
        action: string, target: string, name1?: string, value1?: string, name2?: string, value2?: string,
        name3?: string, value3?: string, name4?: string, value4?: string)
    {
        var url = bpServerPath() + "/putData.asmx/logAction";

        url += "?sessionId=" + sessionId +
            "&gesture=" + gesture +
            "&elementId=" + elementId +
            "&elementType=" + elementType +
            "&action=" + action +
            "&target=" + target +
            "&name1=" + name1 +
            "&value1=" + value1 +
            "&name2=" + name2 +
            "&value2=" + value2 +
            "&name3=" + name3 +
            "&value3=" + value3 +
            "&name4=" + name4 +
            "&value4=" + value4;
        
        //action + " & actionSource = " + actionSource + " & p1 = " + p1 + " & p2 = " + p2 + " & p3 = " + p3;
//         var safeUrl = encodeURI(url);
// 
//         beachParty.httpRead(safeUrl, false, 
//             function (xmlhttp)
//             {
//                 //---- SUCCESS ----
//             },
//             function (e)
//             {
//                 //---- FAILURE ----
//                 //fileFail("logActionToServer", "", e);
//             }, true);
    }

    export function logFeedbackToServer(type: string, feedback: string)
    {
        var url = bpServerPath() + "/putData.asmx/logFeedback";

        //---- use "encodeURI" for the overall URL, if needed ----
        //---- use "encodeURIComponent" for the values of parameters, if needed ---
        url += "?type=" + type + "&feedback=" + encodeURIComponent(feedback);
        
        beachParty.httpRead(url, false,
            function (xmlhttp)
            {},
            function (e)
            {
                this.fileFail("logFeedbackToServer", "", e);
            }, true);
    }

    function fileFail(callerName, url, e)
    {
        throw "Error in " + callerName + ", status=" + e.statusText + "\r\nurl=" + url + "\r\n" + e.responseText;
    }

    export function renderWebPageToPng(pageUrl: string, width: number, height: number, msTimeout: number, callback)
    {
        var url = bpServerPath() + "/putData.asmx/renderWebPageToPng";

        //---- use "encodeURI" for the overall URL, if needed ----
        //---- use "encodeURIComponent" for the values of parameters, if needed ---

        //---- todo: also pass preload ----
        url += "?pageUrl=" + encodeURIComponent(pageUrl) + "&width=" + width + "&height=" + height + "&msTimeout=" + msTimeout;

        beachParty.httpRead(url, false,
            function (xmlhttp)
            {
                //---- SUCCESS ----
                var data = getDataFromResult(xmlhttp, false);
                callback(data);
            },
            function (e)
            {
                //---- FAILURE ----
                fileFail("renderWebPageToPng", pageUrl, e);
            }, true);
    }

    export function writeSessionFile(userName: string, fileName: string, contents: string, callback)
    {
        var body = "userName=" + userName + "&fileName=" + fileName + "&contents=" + contents;
        var safeBody = encodeURIComponent(body);

        var url = bpServerPath() + "/putData.asmx/writeSessionFile";
        var safeUrl = encodeURI(url);

        FileAccess.httpPost(safeUrl, safeBody,
            function (xmlhttp)
            {
                //---- SUCCESS ----
                var data = getDataFromResult(xmlhttp, false);
                callback(data);
            },
            function (e)
            {
                //---- FAILURE ----
                fileFail("writeSessionFile", fileName, e);
            }, true);
    }

    export function readSessionFile(sessionUrl: string, callback)
    {
        var url = bpServerPath() + "/putData.asmx/readSessionFile?sessionUrl=" + sessionUrl;
        //var safeUrl = encodeURI(url);

        var async = true;

        httpRead(url, false, 
            function (xmlhttp)
            {
                //---- SUCCESS (get as raw string, not JSON) ----
                var text = getDataFromResult(xmlhttp, false);

                if (callback)
                {
                    callback(text);
                }
            },
            function (e)
            {
                //---- FAILURE ----
                //throw "readSessionFile: error=" + e.response;
                fileFail("readSessionFile", sessionUrl, e);
            }, async);
    }

    //export function publishAppStateToFile(appStateString: string, callback)
    //{
    //    var safeAppState = encodeURIComponent(appStateString);

    //    var body = "appState=" + safeAppState;

    //    var url = bpServerPath() + "/putData.asmx/publishAppStateToFile";
    //    var safeUrl = encodeURI(url);

    //    fileAccess.httpPost(safeUrl, body, function (xmlhttp)
    //    {
    //        //---- SUCCESS ----
    //        var data = getDataFromResult(xmlhttp, true);
    //        callback(data);
    //    },
    //        function (e)
    //        {
    //            throw "publishAppStateToFile: error=" + e.response;
    //        }, true);
    //}

    //export function getAppStateFromFile(userFn: string, callback?: any): string
    //{
    //    var safeAppState = encodeURIComponent(userFn);
    //    var str = null;
    //    var url = bpServerPath() + "/getData.asmx/GetAppStateFromFile?userFn=" + safeAppState;
    //    var safeUrl = encodeURI(url);

    //    var httpReadJson = false;       // download to us as text
    //    var async = (callback != null);

    //    httpRead(safeUrl, true,
    //        function (xmlhttp)
    //        {
    //            //---- SUCCESS (get as raw string, not JSON) ----
    //            str = getDataFromResult(xmlhttp, false);

    //            if (callback)
    //            {
    //                callback(str);
    //            }
    //        },
    //        function (e)
    //        {
    //            throw "getAppStateFromFile: error=" + e.response;
    //        }, async);

    //    return str;
    //}

}