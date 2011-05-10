describe("Chart Data",function(){
    var P = KISSY.namespace("Gallery.Chart");
    var data, json1, data2, json2;


    beforeEach(function() {
        json1 = {
            type : "Line",
            element : {
                datas : [1,2,3,4],
                labels : ["n","b","n","c"],
                names : ["a1","a2","a3","a4"],
                format : "0.00"
            }
        };
        json2 = {
            type : "PIE",
            elements : [
                {
                    data : 100,
                    name : "bb100",
                },
                {
                    data : 200,
                    name : "bb200",
                },
                {
                    data : 300,
                    name : "bb300",
                }

            ]
        };
        data = new P.Data(json1);
        data2 = new P.Data(json2);
    });

    it("sould return the right form of type", function() {
        expect(data.type).toEqual("line");
        expect(data2.type).toEqual("pie")
    });

    it("sould recognize the element and turn it into array", function() {
        var elements = data.elements();
        var elements2 = data2.elements();
        //elements
        expect(elements.length).toEqual(4);
        expect(elements[1].name).toEqual("a2");
        expect(elements[2].format).toEqual("0.00");

        //elements2
        expect(elements2.length).toEqual(3);
        expect(elements2[1].name).toEqual("bb200");
        expect(elements2[1].data).toEqual(200);
        //defaut label
        expect(elements2[2].format).toEqual("0");
    });
});
