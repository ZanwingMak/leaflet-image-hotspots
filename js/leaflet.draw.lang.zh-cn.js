L.drawLocal = {
    draw: {
        toolbar: {
            // #TODO: this should be reorganized where actions are nested in actions
            // ex: actions.undo  or actions.cancel
            actions: {
                title: '取消绘制',
                text: '取消'
            },
            finish: {
                title: '完成绘制',
                text: '完成'
            },
            undo: {
                title: '删除最后一个节点',
                text: '删除最后一个节点'
            },
            buttons: {
                polyline: '绘制折线',
                polygon: '绘制多边形',
                rectangle: '绘制矩形',
                circle: '绘制圆形',
                marker: '绘制标记'
            }
        },
        handlers: {
            circle: {
                tooltip: {
                    start: '单击并拖动绘制圆形'
                },
                radius: '半径'
            },
            marker: {
                tooltip: {
                    start: '点击标记'
                }
            },
            polygon: {
                tooltip: {
                    start: '单击以开始绘制多边形',
                    cont: '单击以继续绘制多边形',
                    end: '单击第一个节点闭合该多边形'
                }
            },
            polyline: {
                error: '<strong>错误:</strong>绘制图形不能有交叉!',
                tooltip: {
                    start: '单击以开始绘制线条',
                    cont: '单击以继续绘制线条',
                    end: '单击最后一个点到完成绘制线条'
                }
            },
            rectangle: {
                tooltip: {
                    start: '单击并拖动以绘制矩形'
                }
            },
            simpleshape: {
                tooltip: {
                    end: '松开鼠标完成绘制'
                }
            }
        }
    },
    edit: {
        toolbar: {
            actions: {
                save: {
                    title: '保存修改',
                    text: '保存'
                },
                cancel: {
                    title: '取消编辑，丢弃所有修改',
                    text: '取消'
                }
            },
            buttons: {
                edit: '修改',
                editDisabled: '没有可修改的图层',
                remove: '删除',
                removeDisabled: '没有可删除的图层'
            }
        },
        handlers: {
            edit: {
                tooltip: {
                    text: '拖动以修改',
                    subtext: '单击"取消"撤消更改'
                }
            },
            remove: {
                tooltip: {
                    text: '单击要删除的对象'
                }
            }
        }
    }
};