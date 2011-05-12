KISSY.add("gallery/chart/element",function(S){
    var P = S.namespace("Gallery.Chart"),
        Dom = S.DOM,
        Event = S.Event,

        darker = function(c){
            var hsl = c.hslData();
            return new P.Color.hsl(hsl[0],hsl[1],hsl[2]*0.6);
        };

    function Element (data,chart,drawcfg){
        this.data = this.normalize(data);
        this.chart = chart;
        this.type = 0;
        this.drawcfg = drawcfg;
        this.initdata(drawcfg);
        this.init();
    }

    S.mix(Element,{
        getElement : function(a,b,c,type){
            var E;
            switch(type){
                case "line":
                    E = LineElement;
                    break;
                case "pie":
                    E = PieElement;
                    break;
                default:
                    E = BarElement;
            }
            return new E(a,b,c);
        },

        getMax : function(data){
            var max = data[0].data[0],
                elementidx, elementl = data.length,
                dataidx, datal;

            for(elementidx = 0; elementidx < elementl; elementidx ++){
                element = data[elementidx];
                if(element.notdraw) {continue;}
                for(dataidx = 0, datal = element.data.length; dataidx < datal; dataidx++){
                    max = Math.max(max, element.data[dataidx] || 0);
                }
            }
            return max;
        }
    });

    S.augment(Element,
        S.EventTarget,{
        /**
         * normalize the data
         * @argument {Object} the data of chart elements
         */
        normalize : function(data){
            var label,newlabel,
                length = 0,
                fmt;

            S.each(data,function(element){
                if(!element.label){
                    element.label = "{d}";
                }
                element.format = (S.isString(element.format)) ? element.format : "0";
                length = Math.max(element.data.length, length);
                if(S.isString(element.label)){
                    label = element.label;
                    element.label = [];
                    if(S.isArray(element.data)){
                        S.each(element.data,function(d,idx){
                            fmt = '';
                            if(S.isNumber(d)){
                                fmt = P.format(d,element.format);
                            }else{
                                fmt = "null";
                                element.data[idx] = 0;
                            }
                            newlabel = S.substitute(label,{"d" : fmt,"name":element.name});
                            element.label.push(newlabel);
                        });
                    }
                }
            });
            this.maxlength = length;
            return data;
        },

        drawNames : function(ctx){
            var self = this,
                cfg = self.drawcfg,
                data = self.data || self.data.elements(),
                l = data.length,
                i = l - 1,
                d,c,
                br = cfg.right,
                by = cfg.top/2;
            for(; i>=0; i--){
                d = data[i];
                if(d.notdraw){
                    continue;
                }
                c = P.colors[i].c;
                //draw text
                ctx.save();
                ctx.textAlign = "end";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#808080";
                ctx.font = "12px Arial";
                ctx.fillText(d.name, br, by);
                br -= ctx.measureText(d.name).width + 10;
                ctx.restore();
                //draw color dot
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = c;
                ctx.arc(br,by,5,0,Math.PI*2,true);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                br -= 10;
            }
        },
        init : function(){},
        initdata : function(){},
        destory : function(){},
        draw : function(ctx,cfg){},
        drawBar : function(ctx,cfg){},
        getTooltip : function(index){}
    });

    /**
     * class Element for Line chart
     */
    function LineElement(data,chart,drawcfg){
        LineElement.superclass.constructor.call(this,data,chart,drawcfg);
        this._current = -1;
        this.anim = new P.Anim(0.4,"easeInStrong");
        this.anim.init();
    }

    S.extend(LineElement,Element,{
        initdata : function(cfg){
            var self = this,
                ml = self.maxlength,
                data = self.data,
                left = cfg.left,
                bottom = cfg.bottom,
                width = cfg.right - cfg.left,
                height = cfg.bottom - cfg.top,
                maxtop,xtop,
                gap = width/(ml-1),
                i,j;
            S.each(data,function(element,idx){
                if(element.notdraw){
                    return;
                }
                element._points = [];
                element._maxtop = bottom;
                for(i=0; i< ml; i++){
                    ptop = Math.max(bottom - element.data[i]*height/cfg.max, cfg.top - 5);
                    element._maxtop = Math.min(element._maxtop, ptop);
                    element._points.push({
                        x : left + gap*i,
                        y : ptop,
                        bottom : bottom
                    });
                }
            });
            //x top
            self._xtop = [];
            for(i = 0; i < ml; i++){
                xtop = bottom;
                S.each(data,function(element,idx){
                    if(element.notdraw){
                        return;
                    }
                    xtop = Math.min(element._points[i].y, xtop);
                });
                self._xtop.push(xtop);
            }
        },
        draw : function(ctx,cfg){
            var self = this,
                data = self.data,
                left = cfg.left,
                right = cfg.right,
                top = cfg.top,
                bottom = cfg.bottom,
                height = bottom - top,
                max = cfg.max,
                colors = P.colors,
                color,
                maxtop,
                ptop,
                points,i,l,t,
                k = self.anim.get(), gradiet;
            self.drawNames(ctx,cfg);
            if(this._ready_idx !== data.length-1 || k!==1){
                this.fire("redraw");
            }
            if(k === 1 && this._ready_idx < data.length -1){
                self._ready_idx ++;
                self.anim.init();
                k = self.anim.get();
            }
            S.each(data,function(linecfg,idx){
                if(linecfg.notdraw){
                    return;
                }
                if (idx !== self._ready_idx) {
                    t = (idx > self._ready_idx)?0:1;
                }else{
                    t = k;
                }
                color = colors[idx];
                points = linecfg._points;
                //draw bg
                if(linecfg.drawbg){
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    maxtop = bottom - (bottom - linecfg._maxtop)*t;
                    gradiet = ctx.createLinearGradient( left, maxtop, left, bottom);
                    gradiet.addColorStop(0,color.c);
                    gradiet.addColorStop(1,"rgb(255,255,255)");
                    ctx.fillStyle = gradiet;
                    ctx.beginPath();
                    ctx.moveTo(left,bottom);
                    for(i = 0; i < l; i++){
                        p = points[i];
                        ptop = bottom - (bottom - p.y)*t;
                        ctx.lineTo(p.x,ptop);
                    }
                    ctx.lineTo(right,bottom);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                //draw line
                ctx.save();
                l = points.length;
                ctx.strokeStyle = color.c;
                ctx.lineWidth = 2;
                ctx.beginPath();
                for(i = 0; i < l; i++){
                    p = points[i];
                    ptop = bottom - (bottom - p.y)*t;
                    if(i===0){
                        ctx.moveTo(p.x,ptop);
                    } else {
                        ctx.lineTo(p.x,ptop);
                    }
                }
                ctx.stroke();
                ctx.restore();

                //draw point
                ctx.save();
                for(i = 0; i < l; i++){
                    p = points[i];
                    ptop = bottom - (bottom - p.y)*t;
                    //circle outter
                    ctx.fillStyle = color.c;
                    ctx.beginPath();
                    ctx.arc(p.x,ptop,5,0,Math.PI*2,true);
                    ctx.closePath();
                    ctx.fill();
                    //circle innner
                    if(i !== self._current){
                        ctx.fillStyle = "#fff";
                        ctx.beginPath();
                        ctx.arc(p.x,ptop,3,0,Math.PI*2,true);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
                ctx.restore();
            });
        },
        init : function(){
            this._ready_idx = 0;
            Event.on(this.chart,"axishover",this._axis_hover,this);
            Event.on(this.chart,"axisleave",this._axis_leave,this);
        },
        destory : function(){
            Event.remove(this.chart,"axishover",this._axis_hover);
            Event.remove(this.chart,"axisleave",this._axis_hover);
        },
        _axis_hover : function(e){
            var idx = e.index;
            if(this._current !== idx){
                this._current = idx;
                this.fire("redraw");
                this.fire("showtooltip",{
                    left : e.x,
                    top : this._xtop[idx],
                    message : this.getTooltip(idx)
                });
            }
        },
        _axis_leave : function(e){
            this._current = -1;
            this.fire("redraw");
        },
        /**
         * get tip by id
         * @return {object:dom}
         **/
        getTooltip : function(index){
            var self = this,
                data = self.data,
                type = data[0].data.length === 1 ? 0:1,
                colors = P.colors,
                ul,
                elid = "tooltip"+index,
                li;
            //if(self._elcache[elid]) return this._elcache[elid];
            ul = Dom.create("<ul>");
            S.each(data,function(item,idx){
                li = Dom.create("<li>");
                Dom.html(li,
                    "<p style='font-weight:bold;color:"+colors[idx].c+"'>"+
                    item.label[index] +
                    "</p>");
                ul.appendChild(li);
            });
            //self._elcache[elid] = ul;
            return ul;
        }
    });

    /**
     * class BarElement for Bar Chart
     */
    function BarElement(data,chart,drawcfg){
        BarElement.superclass.constructor.call(this,data,chart,drawcfg);
        this.current = [-1,-1];
        this.anim = new P.Anim(0.5,"easeInStrong");
        this.anim.init();
    }
    S.extend(BarElement, Element,{
        initdata : function(cfg){
            var self = this,
                data = self.data,
                ml = this.maxlength,
                n = data.length,
                itemwidth = (cfg.right - cfg.left)/ml,
                gap = itemwidth/5/n,
                padding = itemwidth/3/n,
                barwidth = (itemwidth - (n-1) * gap - 2*padding)/n,
                barheight,barleft,bartop;
            S.each(data, function(element,eidx){
                element._x = [];
                element._top = [];
                element._left = [];
                element._height = [];
                element._width = [];
                element._path = [];
                for(i = 0; i< ml; i++){
                    barheight = (cfg.bottom - cfg.top)* element.data[i] / cfg.max;
                    barleft = cfg.left + i * itemwidth + padding + eidx * (barwidth + gap);
                    bartop = cfg.bottom - barheight;
                    element._left[i] = barleft;
                    element._top[i] = bartop;
                    element._width[i] = barwidth;
                    element._height[i] = barheight;
                    element._path[i] = new P.RectPath(barleft,bartop,barwidth,barheight);
                    element._x[i] = barleft+barwidth/2;
                }
            });
        },
        draw : function(ctx){
            var self = this,
                data = self.data,
                n = data.length,
                ml=self.maxlength,
                color,gradiet,colord,chsl,
                barheight,cheight,barleft,bartop,
                //for anim
                k = self.anim.get(), i;
            self.drawNames(ctx);
            S.each(data, function(bar,idx){
                color = new P.Color(P.colors[idx].c);
                colord = darker(color);
                for(i = 0; i< ml; i++){
                    barleft = bar._left[i];
                    barheight = bar._height[i];
                    cheight = barheight * k;
                    bartop = bar._top[i] + barheight - cheight;
                    barwidth = bar._width[i];
                    //draw backgraound
                    gradiet = ctx.createLinearGradient(barleft,bartop,barleft,bartop + cheight);
                    gradiet.addColorStop(0,color.css());
                    gradiet.addColorStop(1,colord.css());
                    ctx.fillStyle = gradiet;
                    ctx.fillRect(barleft,bartop,barwidth,cheight);
                    //draw label on the bar
                    if(ml === 1 && barheight > 25){
                        ctx.save();
                        ctx.fillStyle = "#fff";
                        ctx.font = "20px bold Arial";
                        ctx.textBaseline = "top";
                        ctx.textAlign = "center";
                        ctx.fillText(P.format(bar.data[i],bar.format), bar._x[i], bartop + 2);
                        ctx.restore();
                    }
                }

            });
            if(k !== 1) {
                self.fire("redraw");
            }
        },
        init : function(){
            Event.on(this.chart,"mousemove",this.chartMouseMove,this);
            Event.on(this.chart,"mouseleave",this.chartMouseLeave,this);
        },
        destory : function(){
            Event.remove(this.chart,"mousemove",this.chartMouseMove);
            Event.remove(this.chart,"mouseleave",this.chartMouseLeave);
        },
        chartMouseMove : function(ev){
            var current = [-1,-1],
                data = this.data;

            S.each(this.data,function(bar,idx){
                S.each(bar._path, function(path,index){
                    if(path.inpath(ev.x,ev.y)){
                        current = [idx,index];
                    }
                });
            });

            if( current[0] === this.current[0] &&
                current[1] === this.current[1])
            {
                return;
            }
            this.current = current;
            if(current[0] + current[1] >= 0){
                this.fire("barhover",{index:current});
                this.fire("showtooltip",{
                    top : data[current[0]]._top[current[1]],
                    left : data[current[0]]._x[current[1]],
                    message : this.getTooltip(current)
                });
            }else{
                this.fire("hidetooltip");
            }
        },
        chartMouseLeave : function(){
            this.current = [-1,-1];
        },
        /**
         * get tip by id
         * @return {object:dom}
         **/
        getTooltip : function(index){
            var self = this,
                eidx = index[0],
                didx = index[1],
                data = self.data,
                colors = P.colors,
                container,
                elid = "tooltip"+index,
                li;
            container = Dom.create("<div>");
            Dom.addClass(container ,"bartip");
            Dom.html(container,
                "<span style='color:"+colors[eidx].c+";'>"+
                this.data[eidx].label[didx]+"</span>");
            return container;
        }
    });

    function PieElement(data,chart,drawcfg){
        console.log(chart)
        S.log("start pie");
        this.data = data;
        this.chart = chart;
        this.type = 0;
        this.drawcfg = drawcfg;
        this.initdata(drawcfg);
        this.init();

        this.anim = new P.Anim(1,"bounceOut");
        this.anim.init();
    }

    S.extend(PieElement,Element,{
        initdata : function(cfg){
            var self = this,
                data = self.data,
                total = 0,
                color,
                pecent,pecentStart;

            self._x = data.showLabels ? cfg.width * 0.618 /2 : cfg.width/2;
            self._y = cfg.height/2;
            self._r = Math.min(cfg.bottom - cfg.top, cfg.right - cfg.left)/2;
            self._lx = cfg.width*0.618;
            self.angleStart = -Math.PI/4;//Math.PI * 7/4;
            self.antiClock = true;
            self.items = [];
            self._currentIndex = -1;
            total = data.sumData();

            pecentStart = 0;
            S.each(data.elements(),function(item,idx){
                pecent   = item.data/total;
                end = pecentStart + pecent;
                self.items.push({
                    start : pecentStart,
                    end : end,
                    color : data.getColor(idx, data.elements().length),
                    textColor : "#999",
                    labelRight : cfg.width - 50,
                    labelY : 50 + 20 * idx
                });
                pecentStart = end;
            });

        },

        /**
         * Draw the Labels for all Element
         * @private
         */
        drawLabels: function(ctx){
            var self = this,
                data = self.data,
                items = self.items,
                item,
                labelX , labelY;
            ctx.save();
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            data.eachElement(function(elem,idx){
                item = items[idx];
                labelY = item.labelY;
                labelX = item.labelRight;
                ctx.fillStyle = items[idx].color;
                ctx.beginPath();
                ctx.moveTo(labelX,labelY)
                ctx.font = "15px sans-serif"
                ctx.fillRect(labelX - 10,labelY-5,10,10);
                ctx.closePath();
                ctx.fillStyle = items[idx].textColor;
                ctx.fillText(elem.name, labelX - 15, labelY);
            });
            ctx.restore();
        },

        draw : function(ctx){
            var self = this,
                px = self._x,
                py = self._y,
                pr = self._r,
                start, end,
                k = self.anim.get(),
                //k = 1,
                gra;
            if(k < 1){
                self.fire("redraw");
            }
            if(self.data.showLabels){
                self.drawLabels(ctx);
            }
            S.each(self.items, function(p, idx){
                start = p.start * k * 2 * Math.PI;
                end = p.end* k * 2 * Math.PI;
                ctx.save();
                ctx.lineWidth = 0.5;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = "#fff";
                ctx.beginPath();
                ctx.moveTo(px,py);
                p._currentStart = self.antiClock?self.angleStart-start:self.angleStart+start;
                p._currentEnd = self.antiClock?self.angleStart-end:self.angleStart+end;
                ctx.arc(px, py, pr, p._currentStart, p._currentEnd, self.antiClock);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });
        },

        init : function(){
            Event.on(this.chart,"mousemove",this.chartMouseMove,this);
            Event.on(this.chart,"mouseleave",this.chartMouseLeave,this);
        },
        destory : function(){
            Event.remove(this.chart,"mousemove",this.chartMouseMove);
            Event.remove(this.chart,"mouseleave",this.chartMouseLeave);
        },
        chartMouseMove : function(ev){
            var self = this,
                pr = self._r,
                dx = ev.x - self._x,
                dy = ev.y - self._y,
                anglestart,
                angleend, angle,t,
                item, items = self.items;

            // if mouse out of pie
            if(dx*dx + dy*dy > pr*pr){
                self.fire("hidetooltip");
                self._currentIndex = -1;
                return;
            };

            //get the current mouse angle from 
            //the center of the pie
            if(dx != 0 ){
                angle = Math.atan(dy/dx);
                if(dy < 0 && dx > 0){
                    angle += 2*Math.PI;
                }
                if(dx < 0){
                    angle += Math.PI;
                }
            }else{
                angle = dy >= 0 ? Math.PI/2 : 3 * Math.PI/2;
            }

            //find the pieace under mouse
            for(i = items.length - 1; i >= 0 ; i--){
                item = items[i];
                t = Math.PI * 2
                anglestart = item._currentStart;
                angleend = item._currentEnd;

                if(anglestart > angleend){
                    t = anglestart;
                    anglestart = angleend;
                    angleend = t;
                }

                t = angleend-anglestart;

                anglestart = anglestart % (Math.PI * 2)

                anglestart < 0 && (anglestart += Math.PI * 2);

                if(angle > anglestart && angle < anglestart + t && i !== self._currentIndxe){
                    self._currentIndex = i;
                    self.fire("showtooltip",{
                        message : self.data.elements()[i].label
                    });
                }
            }

        },
        chartMouseLeave : function(ev){
            this._currentIndex = -1;
            this.fire("hidetooltip");
        }
    });

    P.Element = Element;
    P.LineElement = LineElement;
    P.BarElement = BarElement;
    P.PieElement = PieElement;
    return {
        Element:Element,
        LineElement:LineElement,
        BarElement:BarElement,
        PieElement:PieElement
    };
});
