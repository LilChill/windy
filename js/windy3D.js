let renderer=null;
let scene=null;
let camera=null;
let group = null;
let T0 = new Date();//上次时间
var ThreeJs=function(json){

    this.light=null;
    this.cube=null;
    this.canvasContext=null;
    this.canvasWidth = window.innerWidth;//画板宽度
    this.canvasHeight = window.innerHeight;//画板高度
    this.displayLayers= 1;   //展示层数，最大值为layers-1
    this.particlesNumber = 500;  //生成的粒子个数
    this.speedRate = 0.15;
    this.maxAge=120;
    this.color=0xe0761a;
    this.initOpacity=1; //粒子初始透明度
    this.windData = json;
    this.windField=null;
    this.particles=[];
    this.animateFrame=null;
    this.frameTime = 100;//每秒刷新次数，因为requestAnimationFrame固定每秒60次的渲染，所以如果不想这么快，就把该数值调小一些
    this.uniforms = {
        u_time: {value: 0.0},
        max_age:{type: "f",value:this.maxAge}
    };
    this._init();

}
ThreeJs.prototype={

    constructor:ThreeJs,
    _init(){

        this.windField=this.createField();
        // 创建风场粒子
        for (var i = 0; i < this.particlesNumber; i++) {
            this.particles.push(this.randomParticle(new CanvasParticle()));
        }
        // let curves= this.initCircleCurveGroup();
        // console.log(curves)
        group=new THREE.Group();
        this._initScene();
        this._initLight();
        this._initCamera();
        //var params=this._initObject();
        var axisHelper = new THREE.AxesHelper(2500);
        scene.add(axisHelper);
        this._drawLines();

        this._initRenderer();


    },
    _initRenderer(){
        renderer=new THREE.WebGLRenderer();
        renderer.setSize(this.canvasWidth, this.canvasHeight);//设置渲染区域尺寸
        renderer.setClearColor(0x000000, 1); //设置背景颜色
        document.body.appendChild(renderer.domElement);
        var that=this;
        const loopTime = 10 * 1000; // loopTime: 循环一圈的时间
        var then = Date.now();
        this.canvasContext=renderer.getContext();
        function render (){
            // console.log(camera.position)
            renderer.render(scene,camera);//执行渲染操作

            this.animateFrame=requestAnimationFrame(render);
            var now = Date.now();
            var delta = now - then;
            if (delta > that.frameTime) {

                then = now - delta % that.frameTime;
                that.uniforms.u_time.value+=0.1;
                that.animate();
            }
            // scene.rotateY(0.001*t);//旋转角速度0.001弧度每毫秒
        }
        render();
        // console.log(this.canvasContext)
        var controls=new THREE.OrbitControls(camera,renderer.domElement);//创建控件对象
        // controls.addEventListener('change', render);//监听鼠标、键盘事件
    },
    _initScene(){
        scene= new THREE.Scene()
    },
    _initLight() {
        var point = new THREE.PointLight(0xffffff);
        point.position.set(400, 200, 300); //点光源位置
        scene.add(point); //点光源添加到场景中
        //环境光-->
        var ambient = new THREE.AmbientLight(0x444444);
        scene.add(ambient);
    },
    _initCamera() {
        var k = this.canvasWidth / this.canvasHeight; //窗口宽高比
        var s =600; //三维场景显示范围控制系数，系数越大，显示的范围越大
        //创建相机对象

        var cam = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 1000); //相机构造函数的的前四个参数定义的是拍照窗口大小
        // var camera = new THREE.PerspectiveCamera(60, this.canvasWidth / this.canvasHeight, 1, 1000);
        cam.position.set(0, 0, 616.4); //设置相机位置 //x: 1.9154295320415275, y: 2.076433834086568, z: 616.4349272650278
        cam.lookAt(scene.position); //设置相机方向(指向的场景对象)
        camera=cam;
    },
    changePosition (t,mesh,curve) {

        var position = curve.getPointAt(t); // t: 当前点在线条上的位置百分比，后面计算
        console.log(position)
        mesh.position.copy(position);
    },
    changeLookAt (t,mesh,curve) {
        const tangent = curve.getTangentAt(t);
        var position = curve.getPointAt(t);
        const lookAtVec = tangent.add(position); // 位置向量和切线向量相加即为所需朝向的点向量
        mesh.lookAt(lookAtVec);
    },
    _initObject(){
        var self=this;

        const addCube = (pos) => {
            const geometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial(0xffffff);
            const cube = new THREE.Mesh(geometry, material);
            cube.position.copy(pos);
            self.scene.add(cube);
            return cube;
        }

        const cubeList = this.initialPoints.map(pos => {
            return addCube(pos);
        });

        const curve = new THREE.CatmullRomCurve3(
            cubeList.map((cube) => cube.position) // 直接绑定方块的position以便后续用方块调整曲线
        );
        curve.curveType = 'chordal'; // 曲线类型
        curve.closed = true; // 曲线是否闭合

        const points = curve.getPoints(50); // 50等分获取曲线点数组
        console.log(points)
        const line = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
        ); // 绘制实体线条，仅用于示意曲线，后面的向量线条同理，相关代码就省略了

        scene.add(line);




        // // 立方体网格模型
        // var geometry1 = new THREE.BoxGeometry(100, 100, 100);
        // var material1 = new THREE.MeshLambertMaterial({
        //     color: 0x0000ff,
        //     opacity:0.9,
        //     transparent:true,
        // }); //材质对象Material
        // var mesh1 = new THREE.Mesh(geometry1, material1); //网格模型对象Mesh
        // scene.add(mesh1); //网格模型添加到场景中
        //
        // // 球体网格模型
        // var geometry2 = new THREE.SphereGeometry(60, 40, 40);
        // var material2 = new THREE.MeshStandardMaterial({
        //     color: 0xff00ff,
        //
        //     //wireframe:true
        // });
        // var mesh2 = new THREE.Mesh(geometry2, material2); //网格模型对象Mesh
        // mesh2.translateY(110); //球体网格模型沿Y轴正方向平移120
        // scene.add(mesh2);
        //
        // // 圆柱网格模型
        // var geometry3 = new THREE.CylinderGeometry(50, 50, 100, 25);
        // var material3 = new THREE.MeshLambertMaterial({
        //     color: 0xffff00,
        //     // specular:0x4488ee,
        //     // shininess:12
        // });
        // var mesh3 = new THREE.Mesh(geometry3, material3); //网格模型对象Mesh
        // mesh3.position.set(120,0,0);//设置mesh3模型对象的xyz坐标为120,0,0
        // scene.add(mesh3);
        //
        var axisHelper = new THREE.AxesHelper(2500);
        scene.add(axisHelper);
        //
        // var geometry = new THREE.Geometry();
        // var curve = new THREE.LineCurve3(new THREE.Vector3(10, 20, 10), new THREE.Vector3(-10, -20, -10));
        // var points = curve.getPoints(100);
        // geometry.setFromPoints(points);
        // var material = new THREE.LineBasicMaterial({color: 0xff0000});
        // var line = new THREE.Line(geometry, material);
        // scene.add(line);
        return curve;
    },
    _parseWindJson: function () {
        var header = null,
            component=[];
        this.windData.forEach(function (record) {
            header=record.header;
            var data = record['data'];
            var speed=[],
                angel=[];
            for(var i=0;i<data.length;i++){
                var temp=data[i].split("/");
                speed.push(parseFloat(temp[0]));
                angel.push(parseFloat(temp[1]));
            }
            component.push({
                height: record.header.height,
                speed:speed,
                angel:angel
            });
        });
        // console.log(component)
        return {
            header: header,
            component:component
        };
    },
    createField(){
        var data=this._parseWindJson();
        return new GridSpace(data);
    },
    _drawLines(){
        var self = this;
        var particles = this.particles;
        var geometry=null,material=null;
        let positions=[];

        // var transPointsFrom=null,transPointsTo=null;
        // scene.removeLines();
        // this.canvasContext.canvas.alpha = 0.9;
        // scene.remove(group)
        var shaderMaterial = new THREE.ShaderMaterial({

            uniforms: self.uniforms,

            vertexShader: document.getElementById('vertexShader').textContent,

            fragmentShader: document.getElementById('fragmentShader').textContent,

            blending: THREE.AdditiveBlending,

            depthTest: false,

            transparent: true

        });
        particles.forEach(function (particle) {
            // console.log(self._map(particle.tx, particle.ty,particle.tz))
            //positions=[]
            geometry =new THREE.BufferGeometry();
            var movetopos = self._map(particle.x,particle.y, particle.z);
            var linetopos = self._map(particle.tx, particle.ty,particle.tz);
           // positions.push(movetopos[0],movetopos[1],movetopos[2]);
           // positions.push(linetopos[0],linetopos[1],linetopos[2]);
            // const positions = [movetopos[0],movetopos[1],movetopos[2],linetopos[0],linetopos[1],linetopos[2]];
            // geometry.setAttribute(
            //     "position",
            //     new THREE.BufferAttribute(positions, 3)
            // );
            geometry.setFromPoints([new THREE.Vector3(movetopos[0],movetopos[1],movetopos[2]),new THREE.Vector3(linetopos[0],linetopos[1],linetopos[2])])
            // 线条渲染模式
            //material= new THREE.LineBasicMaterial({ color: self.color,opacity:particle.opacity,transparent:true,linewidth:10})
            // group.add(new THREE.Line(geometry,material))

           // material= new THREE.LineBasicMaterial({ color: self.color,opacity:1,transparent:true,linewidth:10})
            //geometry.attributes.position = new THREE.BufferAttribute(new Float32Array(positions), 3);
            scene.add(new THREE.Line(geometry,shaderMaterial));
        });

        for (let i in scene.children){
            let number = scene.children.length
            let obj = scene.children[i]
            if(obj.type === 'Line'){
                obj.material.opacity*=0.9;
                if (obj.material.opacity < 0.1){
                    obj.material.dispose()
                    obj.geometry.dispose()
                    scene.remove(obj)
                }
            }
        }

        // console.log(scene.children.length)


    },
    animate: function () {
        var self = this,
            field = self.windField;
        var nextX = null,
            nextY = null,
            xy = null,
            uvw = null,uvw0=null;
        self.particles.forEach(function (particle) {
            if (particle.age <= 0) { //一个粒子生命周期结束，则重新生成新的粒子
                self.randomParticle(particle);
            }
            if (particle.age > 0) {
                var x = particle.x,
                    y = particle.y,
                    z = particle.z,
                    tx = particle.tx,
                    ty = particle.ty,
                    tz = particle.tz;

                if (!field.isInBound(tx, ty,tz)) {
                    particle.age = 0;
                } else {
                    // console.log(particle)
                    uvw0 =field.getIn(x, y, z);
                    uvw = field.getIn(tx, ty, tz);
                    //console.log(Math.abs(uvw[1]-uvw0[1]))
                    if(Math.abs(uvw[1]-uvw0[1])>0.5) particle.age=0;
                    else {
                        nextX = tx + self.speedRate * uvw[0] * Math.cos(uvw[1]);
                        nextY = ty + self.speedRate * uvw[0] * Math.sin(uvw[1]);
                        particle.x = tx;
                        particle.y = ty;
                        particle.z = tz;
                        particle.tx = nextX;
                        particle.ty = nextY;
                        particle.tz = z;
                        particle.age--;
                    }

                }
            }
        });
        if (self.particles.length <= 0) this.removeLines();
        self._drawLines();
    },
    removeLines: function () {
        window.cancelAnimationFrame(this.animateFrame);
    },
    transformCoordinate(x,y,z){
        var X,Y,Z;
        X=x+this.canvasWidth/2;
        Y=y+this.canvasHeight/2;
        Z=z;
        return [X,Y,Z];
    },
    //随机数生成器（小数）
    fRandomByfloat:function(under, over){
        return under+Math.random()*(over-under);
    },
    fRandomByInteger:function (under,over){
        return Math.floor(Math.random() * (over - under)) + under;
    },
    //根据当前风场网格行列数随机生成粒子
    randomParticle: function (particle) {
        var safe = 30,x, y,z;

        do {
            x = this.fRandomByfloat(0,this.windField.cols - 2);
            y = this.fRandomByfloat(0,this.windField.rows - 2);
            z = this.fRandomByInteger(0,Math.min(this.displayLayers-1,this.windField.layers - 1));
        } while (this.windField.getIn(x, y, z) <= 0 && safe++ < 30);

        var field = this.windField;
        var uvw = field.getIn(x, y, z);
        var nextX = x +  this.speedRate * uvw[0]*Math.cos(uvw[1]);
        var nextY = y +  this.speedRate * uvw[0]*Math.sin(uvw[1]);
        var nextZ = z;
        // var nextZ = z +  this.speedRate * uvw[2];
        particle.x = x;
        particle.y = y;
        particle.z = z;
        particle.tx = nextX;
        particle.ty = nextY;
        particle.tz=nextZ;
        particle.opacity=this.initOpacity;
        particle.speed = uvw;
        particle.age = Math.round(Math.random() * this.maxAge);//每一次生成都不一样
        return particle;
    },
    //根据粒子当前所处的位置(棋盘网格位置)，得到canvas画板中的位置，以便画图
    _map: function (x,y,z) {
        var field = this.windField,
            fieldWidth = field.cols,
            fieldHeight = field.rows,
            fieldLayers = field.layers,
            newArr = [0,0,0];

        // var noextent = this.generateParticleExtent.length==0;

        // newArr[0] = ((x/fieldWidth)*2)-1;
        // newArr[1] = (-(y/fieldHeight)*2)+1;
        newArr[0] = (x/fieldWidth)*this.canvasWidth-(this.canvasWidth/2);
        newArr[1] = (y/fieldHeight)*this.canvasHeight-(this.canvasHeight/2);
        newArr[2] = (z/fieldLayers)*1000;

        // newArr[0] = Math.floor(((noextent?x:(x-this.generateParticleExtent[0]))/(noextent?fieldWidth:(this.generateParticleExtent[1]-this.generateParticleExtent[0])))*this.canvasWidth);
        // newArr[1] = Math.floor(((noextent?y:(y-this.generateParticleExtent[3]))/(noextent?fieldHeight:(this.generateParticleExtent[2]-this.generateParticleExtent[3])))*this.canvasHeight);
        // console.log(newArr);
        return newArr;
    },

    /**
     *线条路径
     *
     *
     */
    initCircleCurveGroup() {
        let curves = [];
        let self=this;
        this.particles.forEach(function (particle) {
            var curve = new THREE.CatmullRomCurve3(self.createCurve(particle));
            curves.push(curve)
        });
        return curves;
    },
    /**
     * 初始化材质
     * */
    initLineMaterial() {
        // let number = setting ? Number(setting.number) || 1.0 : 1.0;
        // let speed = setting ? Number(setting.speed) || 1.0 : 1.0;
        // let length = setting ? Number(setting.length) || 0.5 : 0.5;
        // let size = setting ? Number(setting.size) || 3.0 : 3.0;
        let color =  new THREE.Vector3(
            Math.random() * 0.6 + 0.4,//0.4 + 0.2,//Math.random() * 0.6 + 0.4
            0.4 + 0.2,
            0.4 + 0.2
        );
        let singleUniforms = {
            u_time:  { value: 0.0 },
            // number: { type: "f", value: number },
            // speed: { type: "f", value: speed },
            // length: { type: "f", value: length },
            // size: { type: "f", value: size },
            color: { type: "v3", value: color},
        };
        return new THREE.ShaderMaterial({
            uniforms: singleUniforms,
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById("fragmentShader").textContent,
            transparent: true,
        });
    },
    createCurve(particle){
        let points=[];
        var self = this,
            field = self.windField;
        var nextX = null,
            nextY = null,
            nextZ = null,
            uvw = null;
        var x = particle.x,
            y = particle.y,
            z = particle.z,
            tx =particle.tx,
            ty = particle.ty,
            tz = particle.tz;
        while(field.isInBound(x,y,z)){
            var movetopos = self._map(x,y, z);
            points.push(new THREE.Vector3(movetopos[0],movetopos[1],movetopos[2]));
            if(!field.isInBound(tx,ty,tz)){
                particle.age=0;
                return null;
            }
            uvw = field.getIn(tx, ty, tz);
            nextX = tx +  self.speedRate * uvw[0]*Math.cos(uvw[1]);
            nextY = ty +  self.speedRate * uvw[0]*Math.sin(uvw[1]);
            nextZ = tz;
            x = tx;
            y = ty;
            z = tz;
            tx = nextX;
            ty = nextY;
            tz = nextZ;
        }
        return points;
    },
}

var GridSpace=function(obj){
    this.west = null;
    this.east = null;
    this.south = null;
    this.north = null;
    this.up=null;
    this.down=null;

    this.rows = null;
    this.cols = null;
    this.layers=null;
    this.dx = null;
    this.dy = null;
    this.dz=null;

    this.grid = null;
    this._init(obj);
};
GridSpace.prototype={
    constructor:GridSpace,
    _init:function (obj){
        var header=obj.header,
            component=obj['component'];
        this.west = header['la1'];
        this.east = header['la2'];
        this.south = header['lb1'];
        this.north = header['lb2'];
        this.up=header['lc2'];
        this.down=header['lc1'];

        this.rows = header['ny'];
        this.cols = header['nx'];
        this.layers=header['nz'];
        this.dx = header['dx'];
        this.dy = header['dy'];
        this.dz = header['dz'];

        this.grid=[];

        var n=0,
            layers = null,rows=null,
            i,j,k;
        for(k=0;k<this.layers;k++){
            layers=[];
            for(j=0;j<this.rows;j++){
                rows=[];
                for(i=0;i<this.cols;i++){
                    var uvw= [component[k].speed[j*this.cols+i],component[k].angel[j*this.cols+i]];
                    rows.push(uvw);
                }
                layers.push(rows);
            }
            this.grid.push(layers);

        }
        // console.log(this.grid);
    },
    _calcUVW:function(u,v,w){
        var val=Math.sqrt(u * u + v * v);
        return [u, v,w, Math.sqrt(val * val + w * w)];
    },
    //双线性插值计算给定节点的速度
    _bilinearInterpolation: function (tx, ty, g00, g10, g01, g11) {
        var rx = (1 - tx);
        var ry = (1 - ty);
        var a = rx * ry, b = tx * ry, c = rx * ty, d = tx * ty;
        var speed = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
        var angel = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
        return [speed,angel];
    },
    //三线性插值计算给定节点的速度
    _trilinearInterpolation: function (tx, ty, tz, g000,g100,g010,g110,g001,g101,g011,g111) {
        var rx = (1 - tx);  //x1-x
        var ry = (1 - ty);  //y1-y
        var rz=  1 - tz;    //z1-z
        var speed,angel,v,w;
        var a=rx*ry*rz, b=rz*ry*tx,c=rz*ty*rx,d=rz*ty*tx,
            e=tz*ry*rx,f=tz*ry*tx,g=tz*ty*rx,h=tz*ty*tx;
        speed=a*g000[0]+b*g100[0]+c*g010[0]+d*g110[0]+e*g001[0]+f*g101[0]+g*g011[0]+h*g111[0];
        angel= a*g000[1]+b*g100[1]+c*g010[1]+d*g110[1]+e*g001[1]+f*g101[1]+g*g011[1]+h*g111[1];
        // u=a*g000[0]+b*g100[0]+c*g010[0]+d*g110[0]+e*g001[0]+f*g101[0]+g*g011[0]+h*g111[0];
        // v=a*g000[1]+b*g100[1]+c*g010[1]+d*g110[1]+e*g001[1]+f*g101[1]+g*g011[1]+h*g111[1];
        // w=a*g000[2]+b*g100[2]+c*g010[2]+d*g110[2]+e*g001[2]+f*g101[2]+g*g011[2]+h*g111[2];
        // uvw=[component[k].speed[j*this.cols+i],component[k].angel[j*this.cols+i]]
        return [speed,angel];
    },
    getIn: function (x, y, z) {
        var x0 = Math.floor(x),//向下取整
            y0 = Math.floor(y),
            // z0=Math.floor(z),
            x1, y1,z1;
        if (x0 === x && y0 === y) {  //x0 === x && y0 === y&&z0===z
            // console.log(x,y)
            return this.grid[z][y][x];
        }

        x1 = x0 + 1;
        y1 = y0 + 1;
        // z1 = z0 + 1;
        var g00 = this.getIn(x0, y0,z),
            g10 = this.getIn(x1, y0,z),
            g01 = this.getIn(x0, y1,z),
            g11 = this.getIn(x1, y1,z);
        return this._bilinearInterpolation(x - x0, y - y0, g00, g10, g01, g11);
        // var g000=this.getIn(x0,y0,z0),
        //     g100=this.getIn(x1,y0,z0),
        //     g010=this.getIn(x0,y1,z0),
        //     g110=this.getIn(x1,y1,z0),
        //     g001=this.getIn(x0,y0,z1),
        //     g101=this.getIn(x1,y0,z1),
        //     g011=this.getIn(x0,y1,z1),
        //     g111=this.getIn(x1,y1,z1);
        // return this._trilinearInterpolation(x - x0, y - y0,z-z0,g000,g100,g010,g110,g001,g101,g011,g111);
    },
    isInBound: function (x, y,z) { //坐标是否在棋盘内部
        return (x >= 0 && x < this.cols-2) && (y >= 0 && y < this.rows-2) && (z >= 0 && z < this.layers-1);
    }

};
/****
 *粒子对象
 ****/
var CanvasParticle = function () {
    this.x = null;//粒子初始x位置(相对于棋盘网格，比如x方向有360个格，x取值就是0-360，这个是初始化时随机生成的)
    this.y = null;//粒子初始y位置(同上)
    this.z = null;//粒子初始z位置(同上)
    this.tx = null;//粒子下一步将要移动的x位置，这个需要计算得来
    this.ty = null;//粒子下一步将要移动的y位置，这个需要计算得来
    this.tz = null;//粒子下一步将要移动的z位置，这个需要计算得来
    this.age = null;//粒子生命周期计时器，每次-1
    this.opacity=null;
    this.speed = null;//粒子移动速度，可以根据速度渲染不同颜色
};
