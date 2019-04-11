const needle = require("needle");
const cheerio = require("cheerio");
const async = require("async");
const fs = require('fs');
const shop = require('./elems');


const lUrl = [
    'https://santechbomba.ru/catalog/cmesiteli-dlya-vanny/',
    'https://santechbomba.ru/catalog/cmesiteli-dlya-vanny/page-2/',
];
let countIt = 210683;


const writeStreamLink = fs.createWriteStream("links.xls");
const headerLink = "Links" + "\n";
writeStreamLink.write(headerLink);

let writeStream = fs.createWriteStream("products.xls");
let header = 'id' + '\t' + "links" + "\t" + "image" + "\t" + "name" + "\t" + "price" + "\t" + "filterItems1" + '\t' + "filterItems2" + '\t' + "filterItems4" + '\t' + "filterItems5" + '\t' + "filterItems5" + "\t" + '\t' + "description" + "\n";
writeStream.write(header);


let lLink = [];

function getL(lUrl) {
    return new Promise(function(resolve){
        needle.get(lUrl,function(err,res){
        const $ = cheerio.load(res.body);
        const link = $('.title-box a');
        link.each(function(i, elem){
            lLink.push("https://santechbomba.ru" + $(elem).attr("href") + '\n');
        }, 2000);
        writeStreamLink.write(lLink + '\n')
        })
        resolve()
    })
}

function getProducts(aUrl) {
    
    needle.get(aUrl,function(err,res){
        if(err) throw(err);
        const $ = cheerio.load(res.body);
        let {title, price, description, img} = shop;
        const imgArray = [];
        const arrDes = [];
        $(img).each((k, i)=>{
            imgArray.push($(i).attr('href'))
            }
        );
        $(description).each(function(k, i){
            arrDes.push($(i).text().replace(/[\n\r\t\' '\"]/g, ''))
        });
        
        function filterItems(query) {
            return arrDes.filter(function(item) {                    
                return item.toString().toLowerCase().indexOf(query.toString().toLowerCase()) > -1 
            })
        };

        const t1 = filterItems("Фирмапроизводитель");
        const t2 = filterItems("Видсмесителя");
        const t3 = filterItems("Способмонтажа");
        const t4 = filterItems("Ширина");
        const t5 = filterItems("Глубина");   

        function sortItem(t, arrDes){
            for (let i = 0; i < t.length; i++) {
                for(let j=0; j<arrDes.length; j++){
                    if(t[i]==arrDes[j]){
                        arrDes.splice(j, 1)
                    }
                }
            }
        }

        sortItem([t1, t2, t3, t4, t5], arrDes);
        
        const countImg = imgArray.length;   
        
        console.log(countImg);
        
        for(var i=0; i<countImg; i++) {
            const row = countIt + '\t' + imgArray[i] + '\t' + countIt + '_' + (i+1) + '.jpg' +'\t' + $(title).text()
                + '\t' + $(price).text() + '\t' + t1 + '>>>'+ '\t'+ t2 + '>>>'+ '\t' + t3 + '>>>'+ '\t' + t4 + '>>>'+ '\t' + t5 + '>>>'+ '\t' + 'descr'+ '\t' + '"' + arrDes.map((v,i)=>{return  v.toString() + '\n'}) + '"' +"\n";
            writeStream.write(row);
        }
        countIt++;                      
    });
}

const parseLinks = function(){
    (async function(){
        const linkDelay = (ms, icount, remain) => new Promise(r => setTimeout(r, ms), console.log("Пройдено страниц: " + icount + ';' + "Осталось страниц: " + remain));
        console.log('Сбор ссылок начат');
        console.log('Количество URL страниц: ' + lUrl.length);
        for(let i = 0; i<lUrl.length; i++){
            const remain = lUrl.length - i - 1;
            await getL(lUrl[i])
            await linkDelay(2000, i+1, remain)
        }
        console.log('Собрано ссылок: ' + lLink.length)
        runNextTask()
    })()
}

const parseProducts = function(){
    (async function a(){
        
        const countLinks = lLink.length;
        console.log('Сбор товаров начат');
        console.log('Всего товаров будет пройдено ' + countLinks);
        let i = 0;
        while(lLink.length > i)
        {
            const delay = (ms, icount, remain) => new Promise(r => setTimeout(r, ms), console.log("Пройдено товаров: " + icount + ';' + 'Осталось товаров:' + remain));
            const remain = lLink.length - i - 1;
            await getProducts(lLink[i]);
            await delay(2000, i+1, remain);
            i++;
        }
        console.log('Выполнено')
        runNextTask()
    })()
}


let currentTaskId = 0;

const tasks = [
  parseLinks,
  parseProducts,
  function(){ console.log('the end'); runNextTask()  }
]


function runNextTask(){
    let task = tasks[currentTaskId++]
    console.log(currentTaskId, task)
    if(task) {
        task()
        } else {
            console.log("Выполнено")
    }
}

runNextTask();
