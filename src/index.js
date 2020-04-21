/**
 * Build styles
 */
require('./index.css').toString();

const TinyYoloV3 = require('tfjs-tiny-yolov3').default;
const smartcrop = require("smartcrop");

// const mobilenet=require('@tensorflow-models/mobilenet');
// console.log(TinyYoloV3)
/**
 * mobilenet Tool for the Editor.js 2.0
 * input : {url}
 * output:{url,width,height}
 */
class TinyYoloV3View {

    static get toolbox() {
        return {
            title: '自动分镜',
            icon: require('./../assets/icon.svg').default,
        };
    }

    constructor({ data, api }) {
        this.data = data;
        this.api = api;
        this.wrapper = {
            block: document.createElement('div'),
            renderSettings: document.createElement('div')
        };

        this.settings = [{
                name: '图片描述',
                icon: require('./../assets/image.svg').default,
                action: () => {
                    this.index = this.api.blocks.getCurrentBlockIndex();
                    this.api.blocks.delete(this.index);
                    this.api.blocks.insert("image", {
                        url: this.data.url,
                        caption: this.data.labels.length > 0 ? this.data.labels.join(",") : "",
                        quote: true
                    });
                }
            },
            {
                name: '拆解场景',
                icon: require('./../assets/crop.svg').default,
                action: () => {
                    this.index = this.api.blocks.getCurrentBlockIndex();
                    this.api.blocks.delete(this.index);
                    Array.from(this.data.images, img => {
                        img = Object.assign({
                            quote: true
                        }, img);
                        this.api.blocks.insert("image", img);
                    });

                }
            }
        ];


        this.CSS = {
            baseClass: this.api.styles.block,
            loading: this.api.styles.loader,
            input: this.api.styles.input,
            button: this.api.styles.button,
            settingsButton: this.api.styles.settingsButton,
            settingsButtonActive: this.api.styles.settingsButtonActive,

            wrapperBlock: "tf-tiny-yolo-v3",
            addButton: "add",
            imgDiv: "imgContainer"
        }



        this.model = new TinyYoloV3(
            nObject = 20,
            scoreTh = .2,
            iouTh = .3);
        this.model.load('web_model/tiny-yolov3/model.json');
        // console.log(this.model)

    }

    render() {

        this.wrapper.block = document.createElement('div');
        this.wrapper.block.classList.add(this.CSS.wrapperBlock);
        this.wrapper.block.setAttribute("data-title", "自动分镜");

        let imgDiv = document.createElement("div");
        this.wrapper.block.appendChild(imgDiv);
        imgDiv.classList.add(this.CSS.imgDiv);
        imgDiv.classList.add(this.CSS.loading);

        if (this.data && this.data.url) {
            setTimeout(() => {
                this._createImage(this.data.url);
            }, 1000);
            return this.wrapper.block;
        }

        const input = document.createElement('input');
        const button = document.createElement("div");

        button.classList.add(this.CSS.addButton);
        button.innerHTML = `<a class="uk-icon-button" uk-icon="plus" data-tip="从本地添加"></a>`;

        button.addEventListener("click", (e) => {
            e.preventDefault();
            input.click();
        });

        input.setAttribute("type", "file");
        input.setAttribute("accept", 'image/*');
        // input.setAttribute("multiple", true);

        // input.value = this.data && this.data.url ? this.data.url : '';
        input.addEventListener("change", (e) => {
            e.preventDefault();
            if (e.target.files.length > 0) {
                //console.log(e.target.files)
                // this.api.caret.setToBlock(this.index);
                const file = e.target.files[0];
                if (file.type.match(/image\//) && !file.type.match(/\/gif/)) {
                    let url = URL.createObjectURL(file);
                    this.wrapper.block.innerHTML = "";
                    let imgDiv = document.createElement("div");
                    this.wrapper.block.appendChild(imgDiv);
                    imgDiv.classList.add(this.CSS.imgDiv);
                    imgDiv.classList.add(this.CSS.loading);
                    this._createImage(url);
                };
            }
        });

        if (this.data && this.data.images) {
            Array.from(this.data.images, img => this._createImage(img));
            return this.wrapper.block;
        };

        this.wrapper.block.appendChild(input);
        this.wrapper.block.appendChild(button);


        if (imgDiv) {
            imgDiv.remove();
        }

        button.click();

        return this.wrapper.block;
    }

    renderSettings() {
        console.log(this.renderSettings)
        this.wrapper.renderSettings = document.createElement('div');

        let canvas = this.wrapper.block.querySelector("canvas");
        // console.log(imgs)
        if (canvas) {

            this.settings.forEach(item => {
                let button = document.createElement('div');
                button.classList.add(this.api.styles.settingsButton);

                button.innerHTML = item.icon;
                this.wrapper.renderSettings.appendChild(button);

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    item.action();
                });
            });

        };

        return this.wrapper.renderSettings;
    }

    save(blockContent) {
        // let frames = [...blockContent.querySelectorAll('.frame img')];

        return {
            url: this.data.url,
            width: this.data.width,
            height: this.data.height
        }
    }

    validate(savedData) {
        if (!(savedData.url && savedData.width && savedData.height)) {
            return false;
        }

        return true;
    }


    _createImage(url) {

        let img = new Image();
        img.onload = async() => {
            let base64 = url;
            let width = img.naturalWidth,
                height = img.naturalHeight;

            if (!url.match(/data\:image\/.*\;base64\,/ig)) {
                let canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                base64 = canvas.toDataURL();
            } else {
                url = URL.createObjectURL(this._dataURLtoBlob(url));
            };

            this.data = {
                url: base64,
                width: width,
                height: height,
                images: []
            };

            //this.wrapper.block.innerHTML = `<img data-src="${url}" data-width="${width}" data-height="${height}" alt="" uk-img>`;

            // this._predict(img);
            img.width = width;
            img.height = height;
            // console.log(img)
            this._detectAndBox(img);

            img.remove();

        };
        img.src = url;

    }


    _dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }


    async _predict(img) {
        const features = await this.model.predict(img);
        console.log('features', features)
    }

    async _detectAndBox(img) {

        //显示运算结果
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;

        let canvasForCrop = document.createElement("canvas");
        let ctxForCrop = canvasForCrop.getContext("2d");
        canvasForCrop.width = img.width;
        canvasForCrop.height = img.height;
        ctxForCrop.drawImage(img, 0, 0, img.width, img.height);

        //裁切1
        const boxes = await this.model.detectAndBox(img, false);
        if (boxes.length > 0) {
            console.log('boxes', boxes);

            let labels = {};

            //每张图都裁出来
            Array.from(boxes, b => {
                ctx.strokeRect(b.left, b.top, b.width, b.height);
                console.log(b.score, b.label);
                labels[b.label] = 1;

                //裁切
                let padding = 4;
                let canvasBox = document.createElement("canvas");
                let ctxBox = canvasBox.getContext("2d");
                canvasBox.width = b.width + padding * 2;
                canvasBox.height = b.height + padding * 2;
                ctxBox.drawImage(canvasForCrop, b.left - padding, b.top - padding, b.width + padding * 2, b.height + padding * 2, 0, 0, canvasBox.width, canvasBox.height);
                this.data.images.push({
                    url: canvasBox.toDataURL(),
                    height: canvasBox.height,
                    width: canvasBox.width,
                    caption: b.label
                });

            });

            this.data.labels = Object.keys(labels);
        };

        //裁切2
        smartcrop.crop(canvas, { width: 200, height: 200 }).then((result) => {
            ctx.strokeRect(result.topCrop.x, result.topCrop.y, result.topCrop.width, result.topCrop.height);
            //裁切
            let padding = 4;
            let canvasBox = document.createElement("canvas");
            let ctxBox = canvasBox.getContext("2d");
            canvasBox.width = result.topCrop.width + padding * 2;
            canvasBox.height = result.topCrop.height + padding * 2;
            ctxBox.drawImage(canvasForCrop, result.topCrop.x - padding, result.topCrop.y - padding, result.topCrop.width + padding * 2, result.topCrop.height + padding * 2, 0, 0, canvasBox.width, canvasBox.height);
            this.data.images.push({
                url: canvasBox.toDataURL(),
                height: canvasBox.height,
                width: canvasBox.width,
                caption: ""
            });
        });


        this.wrapper.block.innerHTML = "";
        this.wrapper.block.appendChild(canvas);

        //this.wrapper.block.classList.remove(this.CSS.loading);
    }

}


module.exports = TinyYoloV3View;