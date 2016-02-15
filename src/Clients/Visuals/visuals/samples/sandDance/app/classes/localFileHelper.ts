//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    localFileHelper.ts - helps open and save to local files.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class LocalFileHelper
    {
        public static loadFile(fileExts: string, callback)
        {
            //---- click on the hidden FILE button to invoke the brower's FILE OPEN dialog ----
//             var button = document.getElementById("inputFileOpen");
//             button.setAttribute("accept", fileExts);
// 
//             //---- MUST clear out previous contents of button (or onchange may not work) ----
//             button.onchange = null;
//             vp.dom.value(button, "");
// 
//             var anyButton = <any>button;
//             button.onchange = (e) =>
//             {
//                 var file = <File>anyButton.files[0];
// 
//                 LocalFileHelper.loadFileFromFileObj(file, callback);
//             }
// 
//             button.click();
        }

        static isZipFile(fn: string)
        {
            var isZip = false;

            if (fn)
            {
                isZip = fn.endsWith(InsightMgrClass.fileExt);
            }

            return isZip;
        }

        static loadFileFromFileObj(file: File, callback)
        {
            if (utils.isImageFile(file.name))
            {
                LocalFileHelper.loadImgFileFromFileObj(file, (url, fn) => 
                {
                    //---- load IMAGE file ----
                    LocalFileHelper.loadImageFromUrl(url, (df, colCount) =>
                    {
                        var preload = new bps.Preload(fn);

                        var cm = new bps.ColorMappingData();
                        preload.colMappings.color = cm;
                        cm.colName = "red";

                        var fp = new bps.FlatParams();
                        preload.flatParams = fp;
                        fp.numColumns = colCount;
                        fp.buildFromTop = true;

                        callback(df, fn, preload);
                    });
                });
            }
            if (this.isZipFile(file.name))
            {
                LocalFileHelper.loadBlobFileFromFileObj(file, callback);
            }
            else
            {
                LocalFileHelper.loadTextFileFromFileObj(file, callback);
            }
        }

        /** loads image as 1 pixel per row, with columns: x, y, r, g, b, a. */
        static loadImageFromUrl(url: string, callback)
        {
            var img = new Image();
            img.onload = (e) =>
            {
                var width = img.width;
                var height = img.height;

                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                var imgData = ctx.getImageData(0, 0, width, height);
                var xVector = [];
                var yVector = [];
                var rVector = [];
                var gVector = [];
                var bVector = [];
                var aVector = [];

                var index = 0;
                for (var r = 0; r < height; r++)
                {
                    for (var c = 0; c < width; c++)
                    {
                        xVector.push(c);
                        yVector.push((height-1) - r);            // correct image flip (for scatter layout)

                        rVector.push(imgData.data[index++]);
                        gVector.push(imgData.data[index++]);
                        bVector.push(imgData.data[index++]);
                        aVector.push(imgData.data[index++]);
                    }
                }

                var result = { x: xVector, y: yVector, red: rVector, green: gVector, blue: bVector, alpha: aVector };
                callback(result, width);
            };

            img.src = url;
        }

        public static getFileOpenSelections(fileExts: string, callback)
        {
            //---- click on the hidden FILE button to invoke the brower's FILE OPEN dialog ----
            var button = document.getElementById("inputFileOpen");
            button.setAttribute("accept", fileExts);

            //---- MUST clear out previous contents of button (or onchange may not work) ----
            button.onchange = null;
            vp.dom.value(button, "");

            button.onchange = (e) =>
            {
                var anyButton = <any>button;
                var files = <File[]>anyButton.files;

                //---- these are reversed and not in a true array; fix. */
                var fileObjArray = <File[]>[];
                for (var i = files.length - 1; i >= 0; i--)
                {
                    fileObjArray.push(files[i]);
                }

                callback(fileObjArray);
            }

            button.click();
        }

        private static loadTextFileFromFileObj(fileToLoad: File, callback)
        {
            //var fileToLoad = button.files[0];

            var fileReader = new FileReader();
            fileReader.onload = function (fileLoadedEvent)
            {
                var text = (<any>fileLoadedEvent.target).result;
                callback(text, fileToLoad.name);
            };

            fileReader.readAsText(fileToLoad);      // , "UTF-8");
        }

        private static loadImgFileFromFileObj(fileToLoad: File, callback)
        {
            //var fileToLoad = button.files[0];

            var fileReader = new FileReader();
            fileReader.onload = function (fileLoadedEvent)
            {
                var imgUrl = (<any>fileLoadedEvent.target).result;
                callback(imgUrl, fileToLoad.name);
            };

            fileReader.readAsDataURL(fileToLoad);    
        }

        private static loadBlobFileFromFileObj(fileToLoad: File, callback)
        {
            //var fileToLoad = button.files[0];

            var fileReader = new FileReader();
            fileReader.onload = function (fileLoadedEvent)
            {
                var arrayBuff = (<any>fileLoadedEvent.target).result;
                callback(arrayBuff, fileToLoad.name);
            };

            //fileReader.readAsDataURL(fileToLoad);
            fileReader.readAsArrayBuffer(fileToLoad);
        }

        public static saveToLocalFile(fn: string, value: any, blobType = "text/plain")
        {
            var blobObject = new Blob([value], { type: blobType });
            this.saveBlobToLocalFile(fn, blobObject, blobType);
        }

        public static saveBlobToLocalFile(fn: string, blobObject: Blob, blobType = "text/plain")
        {
            blobObject.type = blobType;

            if (vp.utils.isIE)
            {
                window.navigator.msSaveOrOpenBlob(blobObject, fn);
            }
            else
            {
//                 var downloadLink = <any>document.getElementById("helperAnchor");
//                 var anyWindow = <any>window;
// 
//                 downloadLink.download = fn;
//                 downloadLink.innerHTML = "Download File";
//                 downloadLink.href = anyWindow.URL.createObjectURL(blobObject);
// 
//                 downloadLink.click();
            }
        }

        public static saveBase64ToLocalFile(fn: string, strBase64: string, blobType = "image/png")
        {
            //---- convert base64 string to a set of byte arrays ----
            var byteChars = atob(strBase64);       // create a character for each byte of binary data represented in strBase64
            var byteNumbers = [];       //new Array(byteCharacters.length);

            for (var i = 0; i < byteChars.length; i++)
            {
                byteNumbers[i] = byteChars.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);
            var blobObject = new Blob([byteArray], { type: blobType });

            this.saveBlobToLocalFile(fn, blobObject, blobType);
        }
    }
}
