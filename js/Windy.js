/****
*风场类
****/
var CanvasWindy = function (json,params) {
    //风场json数据
    this.windData = json;
    //可配置参数
    /**
    * extent 风场绘制时的地图范围，范围不应该大于风场源数据的范围，顺序：west/east/south/north，有正负区分，如：[110,120,30,36]
    * extent参数可以结合使用的地图框架（arcgisjs、leaflet、ol等）动态调整，达到地图缩放时风场同步更新，extent参数改变后需要重新生成风场（redraw函数）
    */
    this.extent = params.extent || [];
    this.canvasContext = params.canvas.getContext("2d");//canvas上下文
    this.canvasWidth = params.canvasWidth || 300;//画板宽度
    this.canvasHeight = params.canvasHeight || 180;//画板高度
    this.speedRate = params.speedRate || 0.15;//风前进速率，可以用该数值控制线流动的快慢，值越大，越快
    this.particlesNumber = params.particlesNumber || 20000;//初始粒子总数，根据实际需要进行调节
    this.maxAge = params.maxAge || 120;//每个粒子的最大生存周期
    this.frameTime = 1000/(params.frameRate || 10);//每秒刷新次数，因为requestAnimationFrame固定每秒60次的渲染，所以如果不想这么快，就把该数值调小一些
    this.color = params.color || '#ffffff';//线颜色，提供几个示例颜色['#14208e','#3ac32b','#e0761a']
    this.lineWidth = params.lineWidth || 1;//线宽度
    //内置参数
    this.generateParticleExtent = [];//根据风场绘制时的extent，计算粒子随机生成时的范围（指的是棋盘网格的行列范围）
    this.windField = null;
    this.particles = [];
    this.animateFrame = null;//requestAnimationFrame事件句柄，用来清除操作
    this._init();
};
CanvasWindy.prototype = {
    constructor: CanvasWindy,
    _init: function () {
        var self = this;
        // 创建风场网格
        this.windField = this.createField();
        //如果风场创建时，传入的参数有extent，就根据给定的extent，让随机生成的粒子落在extent范围内
        if(this.extent.length!==0){
            console.log(this.extent)
            this.extent = [
                Math.max(this.windField.west-180,this.extent[0]),
                Math.min(this.windField.east-180,this.extent[1]),
                Math.max(this.windField.south,this.extent[2]),
                Math.min(this.windField.north,this.extent[3])
            ];
            console.log(this.extent)
            var resHeader = this.windData[0]['header'];
            var nx=resHeader.nx,
                ny=resHeader.ny,
                west = resHeader['lo1'],
                east = resHeader['lo2'],
                south = resHeader['la2'],
                north = resHeader['la1'];
            //计算extent左上角，右下角所在棋盘格的xy位置，加180是因为原始风向数据东西纬度是0-360表示的，根据实际数据可动态调整
            this.generateParticleExtent.push(((this.extent[0]+180)-west)/(east-west)*(nx-2));//左
            this.generateParticleExtent.push(((this.extent[1]+180)-west)/(east-west)*(nx-2));//右
            this.generateParticleExtent.push((north-(this.extent[2]))/(north-south)*(ny-2));//下
            this.generateParticleExtent.push((north-(this.extent[3]))/(north-south)*(ny-2));//上
        }
        // 创建风场粒子
        for (var i = 0; i < this.particlesNumber; i++) {
            this.particles.push(this.randomParticle(new CanvasParticle()));
        }
        this.canvasContext.fillStyle = "rgba(0, 0, 0, 0.97)";
        this.canvasContext.globalAlpha = 0.6;
        this.animate();

        var then = Date.now();
        (function frame() {
            self.animateFrame = requestAnimationFrame(frame);
            var now = Date.now();
            var delta = now - then;
            if (delta > self.frameTime) {
                then = now - delta % self.frameTime;
                self.animate();
            }
        })();
    },
    //根据现有参数重新生成风场
    redraw:function(){
        window.cancelAnimationFrame(this.animateFrame);
        this.particles = [];
        this.generateParticleExtent = [];
        this._init();
    },
    // _reGenerateGrid:function(){
    //     var resHeader = this.windData[0]['header'];
    //     var nx=resHeader.nx,
    //         ny=resHeader.ny,
    //         west = resHeader['lo1'];
    //         east = resHeader['lo2'];
    //         south = resHeader['la2'];
    //         north = resHeader['la1'];
    //         field=this.windField;
    //     //计算extent左上角，右下角所在棋盘格的xy位置，加180是因为原始方向数据东西纬度是0-360表示的
    //     var west_northuv = field.getIn((this.extent[0]+180-west)/(east-west)*nx,(north-this.extent[3])/(north-south)*ny);
    //     var east_southuv = field.getIn((this.extent[1]+180-west)/(east-west)*nx,(north-this.extent[2])/(north-south)*ny);
    //     var uComponent=[],vComponent=[];
    //     for()
    //     this.windData.lo1 = this.extent[0]+180;
    //     this.windData.lo2 = this.extent[1]+180;
    //     this.windData.la1 = this.extent[3];
    //     this.windData.la2 = this.extent[2];
    //     this.windData[0].data = [];
    //     this.windData[1].data = [];
    //     this.windField = this.createField();
    // },
    createField: function () {
        var data = this._parseWindJson();
        return new CanvasWindField(data);
    },
    animate: function () {
        var self = this,
            field = self.windField;
        var nextX = null,
            nextY = null,
            xy = null,
            uv = null;
        self.particles.forEach(function (particle) {
            if (particle.age <= 0) { //一个粒子生命周期结束，则重新生成新的粒子
                self.randomParticle(particle);
            }
            if (particle.age > 0) {
                var x = particle.x,
                    y = particle.y,
                    tx = particle.tx,
                    ty = particle.ty;

                if (!field.isInBound(tx, ty)) {
                    particle.age = 0;
                } else {
                    uv = field.getIn(tx, ty);
                    nextX = tx +  self.speedRate * uv[0];
                    nextY = ty +  self.speedRate * uv[1];
                    particle.x = tx;
                    particle.y = ty;
                    particle.tx = nextX;
                    particle.ty = nextY;
                    particle.age--;
                }
            }
        });
        console.log(self.particles.length)
        if (self.particles.length <= 0) this.removeLines();
        self._drawLines();
    },
    _resize:function(width,height){
        this.canvasWidth = width;
        this.canvasHeight = height;
    },
    _parseWindJson: function () {
        var uComponent = null,
            vComponent = null,
            header = null;
        this.windData.forEach(function (record) {
            var type = record.header.parameterCategory + "," + record.header.parameterNumber;
            switch (type) {
                case "2,2":
                    uComponent = record['data'];
                    header = record['header'];
                    break;
                case "2,3":
                    vComponent = record['data'];
                    break;
                default:
                    break;
            }
        });
        return {
            header: header,
            uComponent: uComponent,
            vComponent: vComponent
        };
    },
    removeLines: function () {
        window.cancelAnimationFrame(this.animateFrame);
    },
    //根据粒子当前所处的位置(棋盘网格位置)，得到canvas画板中的位置，以便画图
    _map: function (x,y) {
        var field = this.windField,
            fieldWidth = field.cols,
            fieldHeight = field.rows,
            newArr = [0,0];

        var noextent = this.generateParticleExtent.length==0;
        newArr[0] = Math.floor((x/fieldWidth)*this.canvasWidth);
        newArr[1] = Math.floor((y/fieldHeight)*this.canvasHeight);

        newArr[0] = Math.floor(((noextent?x:(x-this.generateParticleExtent[0]))/(noextent?fieldWidth:(this.generateParticleExtent[1]-this.generateParticleExtent[0])))*this.canvasWidth);
        newArr[1] = Math.floor(((noextent?y:(y-this.generateParticleExtent[3]))/(noextent?fieldHeight:(this.generateParticleExtent[2]-this.generateParticleExtent[3])))*this.canvasHeight);
        // console.log(newArr);
        return newArr;
    },
    _drawLines: function () {
        var self = this;
        var particles = this.particles;
        this.canvasContext.lineWidth = self.lineWidth;
        //后绘制的图形和前绘制的图形如果发生遮挡的话，只显示后绘制的图形跟前一个绘制的图形重合的前绘制的图形部分，示例：https://www.w3school.com.cn/tiy/t.asp?f=html5_canvas_globalcompop_all
        this.canvasContext.globalCompositeOperation = "destination-in";
        this.canvasContext.fillRect(0,0,this.canvasWidth,this.canvasHeight);
        this.canvasContext.globalCompositeOperation = "lighter";//重叠部分的颜色会被重新计算
        this.canvasContext.globalAlpha = 0.9;

        this.canvasContext.beginPath();
        this.canvasContext.strokeStyle = this.color;
        particles.forEach(function (particle) {
            var movetopos = self._map(particle.x, particle.y);
            var linetopos = self._map(particle.tx, particle.ty);
            self.canvasContext.moveTo(movetopos[0],movetopos[1]);
            self.canvasContext.lineTo(linetopos[0],linetopos[1]);
        });
        this.canvasContext.stroke();
        // console.log(this.canvasContext)
    },
    //随机数生成器（小数）
    fRandomByfloat:function(under, over){
       return under+Math.random()*(over-under);
    },
    //根据当前风场网格行列数随机生成粒子
    randomParticle: function (particle) {
        var safe = 30,x, y;

        do {
            x = this.generateParticleExtent.length==0?this.fRandomByfloat(0,this.windField.cols - 2):this.fRandomByfloat(this.generateParticleExtent[0],this.generateParticleExtent[1]);
            y = this.generateParticleExtent.length==0?this.fRandomByfloat(0,this.windField.rows - 2):this.fRandomByfloat(this.generateParticleExtent[3],this.generateParticleExtent[2]);
        } while (this.windField.getIn(x, y)[2] <= 0 && safe++ < 30);
        var field = this.windField;
        var uv = field.getIn(x, y);
        var nextX = x +  this.speedRate * uv[0];
        var nextY = y +  this.speedRate * uv[1];
        particle.x = x;
        particle.y = y;
        particle.tx = nextX;
        particle.ty = nextY;
        particle.speed = uv[2];
        particle.age = Math.round(Math.random() * this.maxAge);//每一次生成都不一样
        return particle;
    }
};


/****
*棋盘类
*根据风场数据生产风场棋盘网格
****/
var CanvasWindField = function (obj) {
    this.west = null;
    this.east = null;
    this.south = null;
    this.north = null;
    this.rows = null;
    this.cols = null;
    this.dx = null;
    this.dy = null;
    this.unit = null;
    this.date = null;

    this.grid = null;
    this._init(obj);
};
CanvasWindField.prototype = {
    constructor: CanvasWindField,
    _init: function (obj) {  //初始化棋盘
        var header = obj.header,
            uComponent = obj['uComponent'], //u分量风力数据
            vComponent = obj['vComponent']; //v分量风力数据

        this.west = +header['lo1'];
        this.east = +header['lo2'];
        this.south = +header['la2'];
        this.north = +header['la1'];
        this.rows = +header['ny'];
        this.cols = +header['nx'];
        this.dx = +header['dx'];
        this.dy = +header['dy'];
        this.unit = header['parameterUnit'];
        this.date = header['refTime'];

        this.grid = [];
        var k = 0,
            rows = null,
            uv = null;
        for (var j = 0; j < this.rows; j++) {
            rows = [];
            for (var i = 0; i < this.cols; i++, k++) {
                uv = this._calcUV(uComponent[k], vComponent[k]);
                rows.push(uv);
            }
            this.grid.push(rows);
        }
        console.log(this.grid);
    },
    _calcUV: function (u, v) {
        return [+u, +v, Math.sqrt(u * u + v * v)];
    },
    //双线性插值计算给定节点的速度
    _bilinearInterpolation: function (x, y, g00, g10, g01, g11) {
        var rx = (1 - x);
        var ry = (1 - y);
        var a = rx * ry, b = x * ry, c = rx * y, d = x * y;
        var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
        var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
        return this._calcUV(u, v);
    },
    getIn: function (x, y) {
        var x0 = Math.floor(x),//向下取整
            y0 = Math.floor(y),
            x1, y1;
        if (x0 === x && y0 === y) return this.grid[y][x];

        x1 = x0 + 1;
        y1 = y0 + 1;

        var g00 = this.getIn(x0, y0),
            g10 = this.getIn(x1, y0),
            g01 = this.getIn(x0, y1),
            g11 = this.getIn(x1, y1);
        return this._bilinearInterpolation(x - x0, y - y0, g00, g10, g01, g11);
    },
    isInBound: function (x, y) { //坐标是否在棋盘内部
        if ((x >= 0 && x < this.cols - 2) && (y >= 0 && y < this.rows - 2)) return true;
        return false;
    }
};

/****
*粒子对象
****/
var CanvasParticle = function () {
    this.x = null;//粒子初始x位置(相对于棋盘网格，比如x方向有360个格，x取值就是0-360，这个是初始化时随机生成的)
    this.y = null;//粒子初始y位置(同上)
    this.tx = null;//粒子下一步将要移动的x位置，这个需要计算得来
    this.ty = null;//粒子下一步将要移动的y位置，这个需要计算得来
    this.age = null;//粒子生命周期计时器，每次-1
    this.speed = null;//粒子移动速度，可以根据速度渲染不同颜色
};
