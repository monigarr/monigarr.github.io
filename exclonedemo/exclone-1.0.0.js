// <copyright file="exclone.min.cs" company="exClone Inc">
// Copyright (c) 2015 All Right Reserved, http://exclone.com/
//
// All rights reserved.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY 
// KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// </copyright>
// <author>Oguz Akgungor</author>
// <email>oguz@exclone.com</email>
// <date>2016-11-10</date>
// <summary>Contains exclone chat interface</summary>
(function ($) {
    $.fn.exCloneChat = function (options, loadComplete) {
        var settings = $.extend({
            appId: '',
            addInputElements: true,
            fullScreenMode: true,
            useBootstrapSwitch: true,
            chatLabels: false,
            typingParent: false,
            PA: '',
            Origin: '',
            CloneName: ''
        }, options);
        var exCloneChatContainer = $(this);
        var stopped = false;
        var second = 2;
        var deviceId = 0;
        var chResponse;
        var intervalPoint;
        var nextId = 0;
        var nextPlayId = 0;
        var allDone = false;
        var tch = false;
        var totalDelay = 1800;
        var SID = "";
        var timeVoiceInterval;
        var keypressed = false;
        $(document).ready(function () {
            $(exCloneChatContainer).append('<div id="exclone-chat-div" style="overflow-y: scroll; overflow-x: hidden"></div>');
            $(exCloneChatContainer).append('<audio id="exclone-audio" style="display: none" controls ><source id="exclone-audio-src" src="https://api.exclone.com/v1/content/blank.mp3" type="audio/mpeg" /></audio>');
            if (settings.addInputElements) $(exCloneChatContainer).append('<div class="exclone-input-group"><input type="text" id="exclone-user-input" placeholder="Ask ' + settings.CloneName + '..." /><button id="exclone-btn" type="button">Submit >></button></div>');

            getSetDevice();

            addEventListener('touchstart', function (e) {
                if (!tch) {
                    $('#exclone-audio').get(0).pause();
                    $('#exclone-audio').get(0).load();
                    $('#exclone-audio').get(0).play();
                    document.getElementById('exclone-audio').muted = true;
                    tch = true;
                }
            });
            $("#exclone-user-input").bind("input keypress", function (e) {

                if (timeVoiceInterval) clearTimeout(timeVoiceInterval);
                if (e.type == "keypress") {
                    if (e.which == 13 && !stopped &&
                        $("#exclone-user-input").val().trim() != "") {
                        send($("#exclone-user-input").val().trim(), false);
                        e.preventDefault();
                        $("#exclone-user-input").blur();
                    }
                    keypressed = true;
                }
            })

            _assignSID();

            _startSession();

            $('#exclone-audio').on('ended', function () {
                _playEndEvent();
            });
            $('#exclone-audio').on('error', function () {
                nextPlayId++;
                _playNext(false);
            });

            $("#exclone-btn").click(function () {
                if ($("#exclone-user-input").val().trim() != "")
                    send($("#exclone-user-input").val().trim(), false);
            });

            if (loadComplete && typeof loadComplete == "function")
                loadComplete();
        });
        function _assignSID() {
            var ua = window.navigator.userAgent;
            var iOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream;
            if (ua.indexOf("MSIE ") >= 0 ||
                (
                !ua.match('CriOS') && iOS
                )) {
                SID = guid()
            }
        }
        function guid() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                  .toString(16)
                  .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
              s4() + '-' + s4() + s4() + s4();
        }
        function _startSession() {
            send("hi", true);
        }
        function send(userInput, isStart) {
            keypressed = false;
            if (!isStart) _printUser();
            var _init = new Date();
            freeze(isStart);

            $.ajax({
                type: "GET",
                url: "https://api.exclone.com/v3/chat",
                data: {
                    start: isStart,
                    PA: settings.PA,
                    oid: settings.Origin,
                    token: settings.appId,
                    sid: SID,
                    query: userInput,
                    did: deviceId,
                    voice: $("#on-off-sound").is(":checked")
                },
                beforeSend: setHeader,
                xhrFields: {
                    withCredentials: true
                },
                dataType: "jsonp",
                success: function (data) {

                    var _final = new Date()
                    setTimeout(function () {
                        stopTyping(false);
                        if (data != "") {

                            userImage = data.userImage;
                            chResponse = data;
                            nextId = 0;
                            nextPlayId = 0;
                            allDone = false;

                            if (data.fileURLs.length > 0)
                                _playNext(false);
                            else _writeNext(false, false);

                            intervalPoint = setInterval(function () {
                                if (allDone) {
                                    allDone = false;
                                    clearInterval(intervalPoint);
                                    if (typeof data.liveChatId != "undefined" && data.liveChatId != null)
                                        liveOperationInitialize(data.liveChatId)
                                    else if (!isStart) defrost();
                                    else {
                                        if (getParameterByName("q") != "") {
                                            $("#exclone-user-input").val(getParameterByName("q"));
                                            $("#exclone-btn").trigger("click");
                                        }
                                        else defrost();
                                    }
                                }
                            }, 10);

                        }
                    }, 10);


                },
                error: function (xhr, ajaxOptions, thrownError) {
                    stopTyping(false);
                    defrost();
                    allDone = true;
                }
            });
        }
        function getParameterByName(name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }
        function _isImage(text) {
            //return $("<div>" + text + "</div>").find('img').length > 0;
            return text.indexOf("<img") == 0;
        }
        function _isVideo(text) {
            return $("<div>" + text + "</div>").find('iframe').length > 0;
        }
        function getSetDevice() {
            var did = readCookie('_' + cloneName + '_user_device_')
            if (did != null) deviceId = did
            else {
                var i = new Date().getTime();
                i = i & 0xffffffff;
                createCookie('_' + cloneName + '_user_device_', i, 2000);
                deviceId = i;
            }
        }
        function _playNext(firstOne) {
            stopTyping();

            if (typeof chResponse == "undefined") return;

            if (nextPlayId < chResponse.fileURLs.length) {

                if (_isImage(chResponse.answerList[nextId])) {
                    $("#exclone-chat-div").append(_printexCloneImage(chResponse.answerList[nextId]));
                    $(".img-responsive").on("load", function () { _scrollBottom(); });
                    startTyping();
                }
                if (_isVideo(chResponse.answerList[nextId])) {
                    stopTyping();
                    $("#exclone-chat-div").append(_printexCloneVideo(chResponse.answerList[nextId]));
                    startTyping();
                }
                if (nextId < chResponse.answerList.length) {
                    stopTyping();
                    $("#exclone-chat-div").append(_printexClone(chResponse.answerList[nextId]));
                    startTyping();
                }

                if (chResponse.fileURLs[nextPlayId] != "" && _canPlay()) {
                    $('#exclone-audio-src').attr('src', chResponse.fileURLs[nextPlayId]);
                    $('#exclone-audio').get(0).pause();
                    $('#exclone-audio').get(0).load();
                    $('#exclone-audio').get(0).play();
                }
                else if ((chResponse.fileURLs[nextPlayId] == "" || !_canPlay()) && nextId < chResponse.answerList.length && chResponse.answerList[nextId] != "") {
                    stopTyping();
                    $("#exclone-chat-div").append(_printexClone(chResponse.answerList[nextId]));
                    startTyping();
                    _playEndEvent();
                }
                else _playEndEvent();
            }
            else if (nextId < chResponse.answerList.length) {
                stopTyping();
                $("#exclone-chat-div").append(_printexClone(chResponse.answerList[nextId]));
                startTyping();
                _playEndEvent();
            }
            else {
                allDone = true;
            }

            second--;
            ////if (second == 0)
            //{
            //    $("#exclone-chat-div").css('overflow', 'scroll');
            //    $("#exclone-chat-div").css('overflow-x', 'hidden');
            //}
            _scrollBottom();
        }
        function _canPlay() {
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) == false) {
                return true;
            }
            if (tch) return true;
            return false;
        }
        function _playEndEvent() {
            if (nextPlayId < chResponse.fileURLs.length - 1) {
                setTimeout(function () {
                    nextPlayId++;
                    _playNext(false);
                }, 1000);
            }
            else {
                nextPlayId++;
                _playNext(false);
            }
        }
        function _getNextStepTimeout(nextId) {
            if (nextId > 0) nextId = nextId - 1;
            else nextId = 0;

            if (_isImage(chResponse.answerList[nextId])) {
                return 500;
            }
            if (_isVideo(chResponse.answerList[nextId])) {
                return 500;
            }
            if (typeof chResponse.answerList[nextId] != "undefined" && chResponse.answerList[nextId] != null) {
                var delay = chResponse.answerList[nextId].length * 40;
                if (delay > 3600) delay = 3600;

                return delay;
            }
            return 10;
        }
        function _writeNext(firstOne, FM) {
            stopTyping();
            if (nextId < chResponse.answerList.length) {

                if (_isImage(chResponse.answerList[nextId])) {
                    $("#exclone-chat-div").append(_printexCloneImage(chResponse.answerList[nextId]));
                    $(".img-responsive").on("load", function () { _scrollBottom(); });
                }
                if (_isVideo(chResponse.answerList[nextId])) {
                    $("#exclone-chat-div").append(_printexCloneVideo(chResponse.answerList[nextId]));
                    _scrollBottom();
                }

                if (nextId < chResponse.answerList.length) {
                    $("#exclone-chat-div").append(_printexClone(chResponse.answerList[nextId]));
                    startTyping();
                    if (nextId == chResponse.answerList.length) { allDone = true; return; }
                    if (!FM)
                        setTimeout(function () {
                            _writeNext(false, false);
                        }, _getNextStepTimeout(nextId));
                    else {
                        //nextId++;
                        _writeNext(false, false);
                    }
                }
                else {
                    allDone = true;
                }

            }
            else allDone = true;

            second--;

            _scrollBottom();
        }
        function _scrollBottom() {

            var height = $('#exclone-chat-div')[0].scrollHeight;
            $('#exclone-chat-div').scrollTop(height);
        }
        function _printexCloneImage(answer) {
            var srcText = $("<div>" + answer + "</div>").find('img:first').attr('src');
            nextId++;
            var newOne = "<div class='exclone-chat-result clone'><img class='img-responsive' style='max-width: 100%' src='" + srcText + "' /></div><div class='breaker'>&nbsp;</div>";
            return newOne;
        }
        function _printexCloneVideo(answer) {
            var srcText = $("<div>" + answer + "</div>").find('iframe:first').attr('src');
            nextId++;
            //var wid = $(window).width() - 80;
            //if (wid > 500) wid = 500;
            return "<div class='exclone-chat-result clone'><iframe class='cm-iframe' src='" + srcText + "' frameborder='0' allowfullscreen=''></iframe></div><div class='breaker'>&nbsp;</div>";
        }
        function _printexClone(answer) {
            nextId++;
            return "<div class='exclone-chat-result clone'>" + (settings.chatLabels ? "<b>" + settings.CloneName + ": </b>" : "") + answer + "</div><div class='breaker'>&nbsp;</div>";
        }
        function _printUser() {
            $("#exclone-chat-div").append("<div class='exclone-chat-result user'>" + (settings.chatLabels ? "<b>You: </b>" : "") + $("#exclone-user-input").val() + "</div><div class='breaker'>&nbsp;</div>");
            $("#exclone-user-input").val('');
        }
        function startTyping() {
            _scrollBottom();
            if (!settings.typingParent)
                $("#exclone-chat-div").append("<div class='typing'>...</div>");
            else //$("#typing-container").append("<div class='typing'><img src='https://api.exclone.com/livetiles/img/spinner.gif' /> Preparing response...</div>");
            {
                $("#exclone-btn").html("<i class='fa fa-spin fa-refresh'></i> Please wait")
                $("#exclone-btn").attr("disabled", "disabled");
            }
            _scrollBottom();
        }
        function freeze(isStart) {
            $("#exclone-btn").attr('disabled', 'disabled');
            $("#exclone-user-input").attr('disabled', 'disabled');

            stopped = true;
            if (!isStart) startTyping();
        }
        function defrost() {
            $("#exclone-btn").removeAttr('disabled');
            $("#exclone-user-input").removeAttr('disabled');
            stopped = false;
            //if (!_assignSID()) $("#exclone-user-input").focus();
            //if (!settings.fullScreenMode) $("#exclone-user-input").focus();
            var isMobile = false;
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
            || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) isMobile = true;
            if (!isMobile) $("#exclone-user-input").focus();
            stopTyping();
            _scrollBottom();
        }
        function stopTyping() {
            //$(".typing").remove();
            $("#exclone-btn").removeAttr("disabled");
            $("#exclone-btn").html("Submit >>");
            _scrollBottom();
        }
        function addMe(obj) {
            $("#exclone-user-input").val($(obj).attr('data-id'));
            $("#exclone-btn").click();
        }
        function setHeader(xhr) {
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
        }
        function createCookie(name, value, days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                var expires = "; expires=" + date.toGMTString();
            }
            else var expires = "";

            document.cookie = name + "=" + value + expires + "; path=/";
        }

        function readCookie(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        }

        function eraseCookie(name) {
            createCookie(name, "", -1);
        }
    };
}(jQuery));

var isMobile = false; //initiate as false
$(document).ready(function () {
    // device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) isMobile = true;

    var pathnameNotMobile = location.pathname.toLowerCase().indexOf("mobile") == -1
    if (isMobile && pathnameNotMobile) {

    }
    var interval = setInterval(function () {
        if ($.fn.exCloneChat !== undefined) {
            _loadChatBox();
            clearInterval(interval);
        }
    }, 10);


    $("#data-button-menu").click(function () {
        if (!$(".navbar-collapse").is(":visible")) _adjustChatArea();
    })
    $(window).on("resize orientationchange", function () {
        _adjustChatArea();
    })

    if (getParameterByName("nohead") == "true") $("#header").hide();
})
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
function _loadChatBox() {
    $(".clone-name").html(cloneName);
    $("#exclone-user-input").attr("placeholder", "Ask " + cloneName + "...");
    $("#exclone-chat-contanier").exCloneChat({
        appId: excloneAPI,
        fullScreenMode: false,
        addInputElements: true,
        typingParent: true,
        useBootstrapSwitch: false,
        CloneName: cloneName,
        PA: getParameterByName("pa"),
        Origin: getParameterByName("origin")
    }, function () {

        _adjustChatArea(500);

        $("#volumeOnOff").click(function () {
            $(this).toggleClass("fa-volume-up");
            $(this).toggleClass("fa-volume-off");
            if ($("#on-off-sound").is(":checked"))
                $("#on-off-sound").prop("checked", false);
            else $("#on-off-sound").prop("checked", true);
        });
    });
}
function _adjustChatArea(max) {
    var height = 0;
    if (getParameterByName("nohead") == "true") height = $(window).height() - $(".exclone-input-area").outerHeight() - 20;
    else height = $(window).height() - $(".exclone-header-area").outerHeight() - $(".exclone-input-area").outerHeight() - 20;

    if (height > max) height = max;

    $("#exclone-chat-div").css("height", (height - 20).toString() + "px");
    $("#exclone-chat-contanier").css("height", height + "px");
}
function addMe(obj) {
    $("#exclone-user-input").val($(obj).attr('data-id'));
    $("#exclone-btn").click();
}
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
var chat;
function liveOperationInitialize(currentUser) {

    $("#exclone-btn").unbind('click');
    $("#exclone-user-input").unbind('input');
    $("#exclone-user-input").unbind('keypress');

    $.connection.hub.url = 'http://dashboard.exclone.com/signalr';
    chat = $.connection.exCloneLive;

    chat.client.connected = function (connectionId) {
        $("#connectionId").val(connectionId);
        chat.server.joinGroup(currentUser)
        console.log("user connected");
        $("#groupName").val(currentUser);
    };
    // Declare a function on the chat hub so the server can invoke it
    chat.client.addMessage = function (message) {
        // add message
        $("#exclone-chat-div").append(_printexClone(message));
        //stop please wait
        defrost();
    };
    $("#exclone-btn").click(function () {
        _sendMessage()
    });
    $("#exclone-user-input").bind("input keypress", function (e) {
        if (e.type == "keypress") {
            if (e.which == 13) {
                _sendMessage();
            }
        }
    })
    // Start the connection
    $.connection.hub.start(function () {

    });
}
function _sendMessage() {
    // Call the chat method on the server
    chat.server.send($("#exclone-user-input").val(), $("#groupName").val());
    //put message to chat area
    _printUser($("#exclone-user-input").val());
    $("#exclone-user-input").val('');
    //start please wait
    freeze(false);
}
function _scrollBottom() {
    var height = $('#exclone-chat-div')[0].scrollHeight;
    $('#exclone-chat-div').scrollTop(height);
}
function _printexClone(answer) {
    return "<div class='exclone-chat-result clone'>" + answer + "</div><div class='breaker'>&nbsp;</div>";
}
function _printUser() {
    $("#exclone-chat-div").append("<div class='exclone-chat-result user'>" + $("#exclone-user-input").val() + "</div><div class='breaker'>&nbsp;</div>");
    $("#exclone-user-input").val('');
}
function startTyping() {
    _scrollBottom();
    $("#exclone-chat-contanier").append("<div class='typing'><i class='fa fa-spin fa-refresh'></i> Waiting for user...</div>");
    _scrollBottom();
}
function freeze(isStart) {
    $("#exclone-btn").attr('disabled', 'disabled');
    $("#exclone-user-input").attr('disabled', 'disabled');

    stopped = true;
    if (!isStart) startTyping();
}
function defrost() {
    $("#exclone-btn").removeAttr('disabled');
    $("#exclone-user-input").removeAttr('disabled');
    stopped = false;
    //if (!_assignSID()) $("#exclone-user-input").focus();
    //if (!settings.fullScreenMode) $("#exclone-user-input").focus();
    var isMobile = false;
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) isMobile = true;
    if (!isMobile) $("#exclone-user-input").focus();
    stopTyping();
    _scrollBottom();
}
function stopTyping() {
    $(".typing").remove();
    _scrollBottom();
}