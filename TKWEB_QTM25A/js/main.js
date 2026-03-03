$(function () {
	$('[data-start-at]').each(function () {
		var e = $(this);
		e.css('counter-set', e.css('counter-reset') + (e.attr('data-start-at') - 1));
	});
	var observer = new IntersectionObserver(headingScrolled, {
		root: null,
		rootMargin: '-40% 0px -40% 0px'
	});
	if ($('#main-heading').data('start-at')) {
		$('#nav-main').attr('data-start-at', $('#main-heading').data('start-at'));
	}
	$('#nav-main').addClass('heading');
	$('#main-heading>li').each(function (i) {
		$('#nav-main').append(createMenuItem($(this), (i + 1), 1));
	});
	$('#main-heading>li, #main-heading ul.heading>li').each(function (i) {
		observer.observe(this);
	});

	$('#nav-main').on('click', '.nav-link', function (event) {
		event.preventDefault();
		goToSection(this.hash);
	});
	$('#my-breadcrumb').on('click', 'a', function (event) {
		event.preventDefault();
		goToSection(this.hash);
	});
	$('.content').on('click', '.card-title', function () {
		$(this).closest('.card').CardWidget('toggle');
	});
	$('.content').on('click', '.card-error', function (e) {
		$(this).closest('.code-group').find('.card-console').removeClass('hidden').CardWidget('expand');
		e.stopPropagation();
	});
	$('.content').on('click', '.btn-run', function () {
		updateCode($(this).closest('.code-group'), true);
	});
	$('.content').on('click', '.btn-apply', function () {
		updateCode($(this).closest('.code-group'));
	});
	$('.content').on('click', '.btn-clear', function () {
		clearConsole($(this).closest('.code-group'));
	});
	$('.content').on('click', '.btn-reset', function () {
		resetCode($(this).closest('.card').find('.txt-original'));
		updateCode($(this).closest('.code-group'));
	});
	$('.content').on('click', '.btn-copy', function () {
		copyCode($(this).closest('.card').find('.txt-original'));
	});
	$('.content').on('click', '.card-header', function () {
		var txt = $(this).closest('.card').find('.txt-original');
		if (txt.length == 1) { txt.data('editor').focus(); };
	});
	if (typeof CodeMirror !== 'undefined') {
		CodeMirror.defaults.theme = 'mdn-like';
		CodeMirror.defaults.tabSize = 3;
		CodeMirror.defaults.indentUnit = 3;
		CodeMirror.defaults.indentWithTabs = true;
		CodeMirror.defaults.lineNumbers = true;
		CodeMirror.defaults.lineWrapping = true;
		CodeMirror.defaults.foldGutter = true;
		CodeMirror.defaults.gutters = ["CodeMirror-linenumbers", "CodeMirror-foldgutter"];
		CodeMirror.defaults.matchBrackets = true;
		CodeMirror.defaults.autoCloseBrackets = true;
		CodeMirror.defaults.matchTags = true;
		CodeMirror.defaults.autoCloseTags = true;
		CodeMirror.defaults.resetSelectionOnContextMenu = false;
		CodeMirror.defaults.pollInterval = 10000;
		CodeMirror.defaults.workTime = 100;
		CodeMirror.defaults.workDelay = 500;
	}
	$('a[href^="http"]').each(function () {
		if (window.self !== window.top) {return}
		if ($(this).closest('.code-group').length != 0) {return}
		this.target = "_blank";
		var a = $(this);
		if (a.find('img').length == 0) {
			a.append('<i class="fas fa-external-link-alt text-xs"></i>');
		}
	});
	$('#nav-main').find('.nav-link').first().trigger('click');
	//puka
	$('.collapse.collapse-chain').each((i, ele) => {
		let $ele = $(ele);
		$ele.on('shown.bs.collapse', (e) => {
			$ele.next('.collapse.collapse-chain').collapse('show');
		});
		$ele.on('hidden.bs.collapse', (e) => {
			$ele.next('.collapse.collapse-chain').collapse('hide');
		});
	});
	//test fold console
	CodeMirror.defineMode("console", function (config, parserConfig) {
		return {
			token: function (stream, state) {
				stream.skipToEnd();
				return null;
			},
			fold: "brace"
		}
	});
	CodeMirror.defineMIME("text/console", "console");

});
function toStringRecursive(obj, env = window, level = 1, maxDepth = 5) {
	//console.log(level,':',obj);

	switch (typeof obj) {
		case 'number':
		case 'bigint':
		case 'boolean':
			return obj.toString();
		case 'string':
			return '"' + obj + '"';
		//return obj;
		case 'undefined':
			return 'undefined';
		case 'function':
			return obj.toString();//???
		case 'object':
			if (obj instanceof env.Element) {
				if (obj.innerHTML.length <= 100) {//magic number?
					return obj.outerHTML;
				}
				let tmp = obj.cloneNode(false);
				tmp.innerText = '...';
				return tmp.outerHTML;
			}
			if (obj instanceof env.Date) {
				return obj.toString();
			}
			if (obj == null) { return 'null'; }
			if (obj instanceof env.NamedNodeMap) {//element.attributes
				if (level > maxDepth) { return '[...]'; }
				let s = [], s1 = [], s2 = [], tab = '';
				for (let i = 0; i < obj.length; i++) {
					let t = toStringRecursive(obj[i], env, level + 1, level + 1);
					// let t = obj[i].toString();
					s1.push(i + ': ' + t);
					s2.push(obj[i].name + ': ' + t);
				}
				s = [...s1, ...s2];
				for (let i = 0; i < level; i++) { tab += '\t' }
				return '{\n' + tab + s.join(',\n' + tab) + '\n'+ tab.slice(0, -1) + '}';
			}
			if (env.Array.isArray(obj)
				|| obj instanceof env.HTMLCollection //getElementsByXXX
				|| obj instanceof env.NodeList //querySelectorAll
				|| obj instanceof env.DOMTokenList //element.classList
				|| typeof obj.length === 'number' //jquery selector?
				/* || ??? */) {
				if (level > maxDepth) { return '[...]'; }
				let s = [];
				for (let i = 0; i < obj.length; i++) {
					s.push(toStringRecursive(obj[i], env, level + 1, maxDepth));
				}
				return '(' + obj.length + ') [' + s.join(', ') + ']';
			}
			/* if (???) */
			// if(typeof obj.toString =="function" && obj.toString !== env.Object.prototype.toString){
			// 	return obj.toString();
			// }
			if (level > maxDepth) { return '{...}'; }
			let arr = [], tab = '';
			for (let x in obj) {
				arr.push(`${x}: ${toStringRecursive(obj[x], env, level + 1, maxDepth)}`);
			}
			for (let i = 0; i < level; i++) { tab += '\t' }
			return '{\n' + tab + arr.join(',\n' + tab) + '\n'+ tab.slice(0, -1) + '}';
		default:
			return '???';
	}
}
function writeConsole(group, msg) {
	var txt = group.find('.card-console .txt-original');
	var cm = txt.data('editor');
	txt[0].textContent += (txt[0].textContent === '' ? '' : '\n') + msg;
	cm.setValue(txt.val());
	cm.scrollIntoView({ line: cm.doc.lastLine(), char: 0 }, 50)
}
function clearConsole(group) {
	var txt = group.find('.card-console .txt-original');
	var cm = txt.data('editor');
	txt[0].textContent = '';
	cm.setValue(txt.val());

	group.data('errorCount', 0);
	group.find('.errorCount').html(0);
	group.find('.card-error').addClass('hidden');
}
function goToSection(id) {
	var li = $(id).closest('li');
	li.find('.card').first().parents('.card').addBack().each(function () {
		$(this).CardWidget('expand');
	});
	activate(li);
	setTimeout(function (id) { $(id)[0].scrollIntoView() }, 400, id);
}
function initCode(group) {
	group.find('.code-highlight').each(function () {
		let ele = $(this);
		let html = '';
		if (ele.children().first().prop('tagName') === "SCRIPT") {
			html = ele.children().first().html().replace(/&#47;/g, '/');
		}
		else {
			html = ele.html();
		}
		html = html.trim();
		let language =
			(ele.hasClass('language-css') ? 'css'
				: (ele.hasClass('language-javascript') ? 'javascript'
					: (ele.hasClass('language-html') ? 'htmlmixed' : null)));
		let title = language.replace('mixed', '');
		let txt = $('<textarea></textarea>').addClass('txt-original');
		txt[0].textContent = html;
		let card = $($('#card-code').html()).removeAttr('id').addClass('card-' + title);
		if (language != 'javascript') {
			card.find('.btn-run').remove();
		}
		else {
			card.find('.btn-apply').remove();
			if (ele.hasClass('jquery')) {
				title += ' (jQuery)';
			}
		}
		card.find('.card-title').html(title);
		card.find('.btn-clear,.card-error').remove();
		group.append(card);
		card.find('.card-body').append(txt);
		let cm = CodeMirror.fromTextArea(txt[0], {
			mode: language,
			lineNumbers: ele.hasClass('line-numbers')
		});
		if (!ele.hasClass('no-auto-indent')) {
			cm.execCommand('selectAll');
			cm.execCommand('indentAuto');
			cm.execCommand('goDocStart');
			cm.execCommand('save');
		}
		txt.data('editor', cm);
		txt.data('reload', cm.getValue());
		ele.remove();
		card.addClass(ele.attr('class'));
	});
	let txt = $('<textarea></textarea>').addClass('txt-original');
	let title = 'console';
	cardConsole = $($('#card-code').html()).removeAttr('id').addClass('card-' + title);
	txt[0].textContent = '';
	cardConsole.find('.card-title').html(title);
	cardConsole.find('.btn-run, .btn-apply, .btn-copy, .btn-reset').remove();
	group.append(cardConsole);
	cardConsole.find('.card-body').append(txt);
	let cm = CodeMirror.fromTextArea(txt[0], {
		mode: 'text/console',//console?
		readOnly: true
	});
	txt.data('editor', cm);
	group.data('errorCount', 0);
	group.find('.errorCount').html(0);
	group.find('.card-console,.card-error').addClass('hidden');
	updateCode(group);
}
function resetCode(txt) {
	var cm = txt.data('editor');
	var c = cm.doc.getCursor();
	cm.setValue(txt.data('reload'));
	cm.execCommand('selectAll');
	cm.execCommand('indentAuto');
	cm.doc.setCursor(c);

}
function copyCode(txt) {
	var cm = txt.data('editor');
	copyToClipboard(cm.getValue());
	//cm.focus();
}
function updateCode(group, runJS = false) {
	let content = group.find('.show-result .txt-original');
	if (content.length == 0) { return };
	group.find('.card-result').remove();
	let frame = $('<iframe srcdoc="<!DOCTYPE html><html><head></head><body></body></html>"></iframe>').addClass('code-result');
	let card = $($('#card-code').html()).removeAttr('id').addClass('card-result');
	card.find('.card-title').html('Result');
	card.find('.btn-run,.btn-clear,.btn-apply,.btn-copy,.btn-reset,.card-error').remove();
	group.find('.card-console').before(card);
	card.find('.card-body').append(frame);
	frame[0].onload = function () {
		var frm = $(this);
		if (frm.data('css')) {
			frm.contents().find('head').append(frm.data('css'));
		}
		if (frm.data('html')) {
			frm.contents().find('body').append(frm.data('html'));
		}
		if (frm.data('jquery')) {
			frm.contents().find('body').append(frm.data('jquery'));
		}
		if (frm.data('js')) {
			frm.contents().find('body').append(frm.data('js'));
		}
		frm.height(frm.contents().height());
	};
	frame[0].contentWindow.onerror = function (event, source, lineno, colno, error) {
		//console.log(event, source, lineno, colno, error.stack);
		let group = $(this.frameElement).closest('.code-group');
		let errorCount = group.data('errorCount');
		group.data('errorCount', ++errorCount);
		group.find('.errorCount').html(errorCount);
		group.find('.card-console,.card-error').removeClass('hidden');
		let msg = error.stack.split('\n', 2);
		if (msg.length < 2) {
			msg.push(' at "' + source + '":' + lineno + ':' + colno);
		}
		msg = msg.join('\n');
		writeConsole(group, msg);
		return true;
	}
	frame[0].contentWindow.console.log = function (...data) {
		console.log(...data);
		let msg = '';
		if (data.length == 1) {
			msg = toStringRecursive(data[0], frame[0].contentWindow);
		} else {
			msg = data.map(x => toStringRecursive(x, frame[0].contentWindow)).join(' ');
		}
		writeConsole(group, msg);
	}
	let css = group.find('.language-css');
	if (css.length) {
		frame.data('css', '<style>' + css.find('.txt-original').data('editor').getValue() + '</style>');
	}
	frame.data('html', content.data('editor').getValue());
	let js = group.find('.language-javascript');
	if (js.length) {
		if (js.hasClass('console-only') || js.hasClass('js-only')) {
			card.addClass('hidden');
		}
		if (js.hasClass('show-console') || js.hasClass('console-only')) {
			group.find('.card-console').removeClass('hidden');
		}
		if (js.hasClass('jquery')) {
			frame.data('jquery', '<script>if (typeof(jQuery) == "undefined") {window.jQuery = function (selector) { return parent.jQuery(selector, document); }; jQuery = parent.$.extend(jQuery, parent.$);window.$ = jQuery;}<\/script>');
		}
		if (runJS || js.hasClass('auto-run')) {
			frame.data('js', '<script>' + js.find('.txt-original').data('editor').getValue() + '<\/script>');
		}
	}
}

function copyToClipboard(text) {
	if (navigator.clipboard) {
		navigator.clipboard.writeText(text).then(
			() => {
				/* success */
			},
			() => {
				/* failure */
				console.warn("Copy to clipboard failed.");
			}
		);
	}
	else if (window.clipboardData && window.clipboardData.setData) {
		// IE specific code path to prevent textarea being shown while dialog is visible.
		return clipboardData.setData("Text", text);

	} else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
		var textarea = document.createElement("textarea");
		textarea.textContent = text;
		textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
		document.body.appendChild(textarea);
		textarea.select();
		try {
			return document.execCommand("copy");  // Security exception may be thrown by some browsers.
		} catch (ex) {
			console.warn("Copy to clipboard failed.", ex);
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
}
function slugify(string) {
    const a = 'àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;'
    const b = 'aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')
    return string.toString().toLowerCase()
        .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
        .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
        .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
        .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
        .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
        .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
        .replace(/đ/gi, 'd')
        .replace(/\s+/g, '-')
        .replace(p, c => b.charAt(a.indexOf(c)))
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
}
function createMenuItem(li, id, level) {
	id = id + '-';
	var item = $(li[0].cloneNode(false));
	var txt = li[0].firstElementChild.innerHTML;
	li[0].firstElementChild.remove();
	var s = id + slugify(txt);
	var hack = $('<span></span>').addClass('scroll-hack').attr('id', s);
	var p = $('<p></>').addClass('heading-number').html(txt);
	var a = $('<a></a>').addClass('nav-link').attr('href', '#' + s).append(p);
	item.append(a);
	item.addClass('nav-item');
	if (li.children('.heading').length == 1) {
		//item.addClass('menu-open');
		//a.append('<i class="right fas fa-angle-left"></i>');
		//var ul=$('<ul></ul>').addClass('heading nav nav-treeview');
		var ul = $('<ul></ul>').addClass('heading nav nav-pills nav-sidebar nav-compact nav-child-indent flex-column');
		li.children('.heading').first().children('li').each(function (i) {
			ul.append(createMenuItem($(this), id + (i + 1), level + 1));
		});
		item.append(ul);
	}

	var card = $($('#card-text').html()).removeAttr('id');
	var tag = level <= 6 ? ('h' + level) : 'p';
	var title = card.find('.card-title')[0].cloneNode(false).outerHTML;
	title = title.replace(/(^<\S+)|(\/\S+>$)/, '<' + tag);
	title = $(title);
	title.html(txt).addClass('heading-number');
	card.find('.card-title').replaceWith(title);
	card[0].tagName = tag;
	card.find('.card-body').append(li.children());

	li.append(card);
	li.prepend(hack);
	li.data('menu-item', item);
	item.data('menu-item', li);
	return item;
}
function headingScrolled(entries, observer) {
	//console.log(entries);
	if (entries.length == 1 && !entries[0].isIntersecting) {
		activate(entries[0].target, false);
		return;
	}
	for (var i = entries.length - 1; i >= 0; i--) {
		if (entries[i].isIntersecting) {
			activate(entries[i].target);
			break;
		}
	}
	// Each entry describes an intersection change for one observed
	// target element:
	//   entry.boundingClientRect
	//   entry.intersectionRatio
	//   entry.intersectionRect
	//   entry.isIntersecting
	//   entry.rootBounds
	//   entry.target
	//   entry.time

}
function activate(e, active = true) {
	var li = $(e);
	if (!active) {
		if (li.hasClass('current')) {
			li = li.parent().closest('li');
			if (li.length == 0) { return; }
		}
		else { return; }
	}
	$('#main-heading li.current').removeClass('current');
	li.addClass('current');

	var title = li.find('.heading-number');
	var item = li.data('menu-item');
	var bc = $('#my-breadcrumb');
	bc.html($('<li></li>').html(title.html()));
	li.parents('li').each(function () {
		var link = $(this).data('menu-item').children('.nav-link').first();
		var a = $('<a></a>').attr('href', link.attr('href')).html($('<span></sapn>').html(link.children('.heading-number').html()));
		bc.prepend($('<li></li>').html(a));
	});

	if (!li.data('code-loaded')) {
		li.data('code-loaded', true);
		li.find('.code-group').each(function () {
			//console.log($(this).closest('.heading li')[0]);
			if (!($(this).closest('.heading>li').hasClass('current'))) { return; }
			var x = window.scrollX;
			var y = window.scrollY;
			initCode($(this));
			window.scrollTo(x, y);
		});
	}

	$('#nav-main').find('.active').removeClass('active');
	if (item.find('ul').length > 0) { return; }
	item.find('.nav-link').addClass('active');
}

document.addEventListener("DOMContentLoaded", () => {console.log("DOMContentLoaded", new Date().getMilliseconds());});
window.addEventListener("load", () => {console.log("load", new Date().getMilliseconds());});