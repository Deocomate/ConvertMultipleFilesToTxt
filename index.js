// --- DOM Elements ---
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const textContent = document.getElementById('textContent');
const copyBtn = document.getElementById('copyBtn');
const copySuccess = document.getElementById('copySuccess');
const clearBtn = document.getElementById('clearBtn');
const stats = document.getElementById('stats');
const loading = document.getElementById('loading');
const loadingStatus = document.getElementById('loadingStatus');
const dropAreaText = document.querySelector('#dropArea p');


// --- Constants ---
const textFileExtensions = [
    'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'xml', 'svg', 'xhtml',
    'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'inc',
    'py', 'pyw', 'pyc', 'pyd', 'pyo', 'pyx', 'ipynb',
    'rb', 'rbw', 'rake', 'gemspec', 'erb',
    'java', 'class', 'jsp', 'jspx', 'properties',
    'c', 'cpp', 'cc', 'h', 'hpp', 'hxx', 'cxx',
    'cs', 'csx', 'razor',
    'go', 'mod',
    'rs', 'rlib',
    'scala', 'sc',
    'swift',
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'sh', 'bash', 'zsh', 'fish', 'cmd', 'bat', 'ps1',
    'sql', 'sqlite', 'psql',
    'txt', 'md', 'markdown', 'rst', 'tex', 'log', 'rtf', 'wiki', 'csv', 'tsv',
    'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env', 'htaccess',
    'dart', 'lua', 'r', 'pl', 'pm', 'kt', 'kts', 'groovy', 'gradle',
    'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'graphql', 'gql',
    'md', 'txt', 'rst', 'adoc', 'wiki', 'textile',
    'gitignore', 'gitattributes', 'gitmodules',
    'makefile', 'cmake', 'dockerfile', 'npmrc', 'yarnrc',
    'hs', 'lhs', 'elm', 'clj', 'cljs', 'fs', 'fsx', 'ml', 'mli', 'erl', 'hrl',
    'tex', 'bib', 'sty'
];
const readableMimeTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/x-javascript',
    'application/ecmascript',
    'application/typescript',
    'application/x-httpd-php',
    'application/x-sh',
    'application/x-csh',
    'application/xhtml+xml',
    'application/x-tex',
    'application/x-latex'
];
const mimeExtensionMap = {
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/json': 'json',
    'application/xml': 'xml',
    'image/svg+xml': 'svg'
};

// --- State Variables ---
let files = [];
let gitignoreRules = [];
let gitignoreFound = false;
let rootPath = '';


// --- Utility Functions ---

const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
};

const highlight = () => dropArea.classList.add('active');
const unhighlight = () => dropArea.classList.remove('active');

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getExtensionFromMime = (mimeType) => mimeExtensionMap[mimeType] || 'txt';

const readFileAsync = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsText(file);
    });
};

const isTextFile = (file) => {
    if (file.type) {
        for (const mimeType of readableMimeTypes) {
            if (file.type.startsWith(mimeType)) return true;
        }
    }
    const extension = file.name.split('.').pop().toLowerCase();
    if (textFileExtensions.includes(extension)) return true;

    const filenameWithoutExt = file.name.toLowerCase();
    const commonTextFiles = ['dockerfile', 'makefile', 'readme', 'license', 'authors', 'changelog',
        'gitignore', 'bashrc', 'zshrc', '.env', '.gitignore', '.npmrc'];

    if (commonTextFiles.includes(filenameWithoutExt)) return true;
    return file.size < 100 * 1024;
};



// --- Gitignore Handling ---
const parseGitignore = async (file) => {
    try {
        const content = await readFileAsync(file);
        gitignoreRules = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(rule => {
                if (rule.endsWith('/')) return rule;
                const commonFolders = ['node_modules', 'vendor', 'dist', 'build', '.git', '.idea', '.vscode', 'coverage', 'logs', 'tmp'];
                return commonFolders.includes(rule) ? rule + '/' : rule;
            });

        console.log('Đã đọc .gitignore với', gitignoreRules.length, 'quy tắc');
        console.log('Các quy tắc:', gitignoreRules);
        gitignoreFound = true;
        return true;
    } catch (error) {
        console.error('Lỗi khi đọc file .gitignore:', error);
        return false;
    }
};

const isIgnored = (path) => {
    if (!gitignoreFound || !path) return false;

    let relativePath = path;
    if (rootPath && path.startsWith(rootPath)) {
        relativePath = path.substring(rootPath.length);
    }
    if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;
    relativePath = relativePath.substring(1);


    for (const rule of gitignoreRules) {
        if (rule.endsWith('/')) {
            const folderName = rule.slice(0, -1);
            if (relativePath === folderName || relativePath.startsWith(folderName + '/') || relativePath.includes('/' + folderName + '/')) {
                console.log(`Path ${relativePath} matched folder rule ${rule}`);
                return true;
            }
            continue;
        }

        if (rule.includes('*') || rule.includes('?')) {
            let regexPattern = rule.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
            const regex = new RegExp(`^${regexPattern}$|^${regexPattern}/|/${regexPattern}$|/${regexPattern}/`);
            if (regex.test(relativePath)) {
                console.log(`Path ${relativePath} matched wildcard rule ${rule}`);
                return true;
            }
            continue;
        }

        if (relativePath === rule || relativePath.endsWith('/' + rule) || relativePath.startsWith(rule + '/') || relativePath.includes('/' + rule + '/')) {
            console.log(`Path ${relativePath} matched exact rule ${rule}`);
            return true;
        }
    }

    return false;
};

const isDirectoryIgnored = (dirPath) => {
    if (!gitignoreFound) return false;

    let relativePath = dirPath;
    if (rootPath && dirPath.startsWith(rootPath)) {
        relativePath = dirPath.substring(rootPath.length);
    }

    if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;
    if (relativePath.endsWith('/')) relativePath = relativePath.slice(0, -1);
    relativePath = relativePath.substring(1);

    const dirName = relativePath.split('/').pop();
    const commonIgnoredDirs = ['node_modules/', 'vendor/', '.git/', 'dist/', 'build/', '.idea/', '.vscode/', 'coverage/'];

    for (const ignoredDir of commonIgnoredDirs) {
        if (dirName === ignoredDir.slice(0, -1)) {
            console.log(`Directory ${dirPath} matched common pattern ${ignoredDir}`);
            return true;
        }
    }

    for (const rule of gitignoreRules) {
        if (rule.endsWith('/')) {
            const folderPattern = rule.slice(0, -1);
            if (dirName === folderPattern || relativePath === folderPattern || relativePath.endsWith('/' + folderPattern)) {
                console.log(`Directory path ${relativePath} matched folder rule ${rule}`);
                return true;
            }
        }
    }
    return isIgnored(dirPath);
};

// --- File/Directory Handling ---

const readDirectoryEntries = async (directoryEntry, fileList) => {
    const reader = directoryEntry.createReader();

    const readEntries = () => new Promise((resolve, reject) => {
        reader.readEntries(entries => resolve(entries), error => reject(error));
    });

    let entries;
    const promises = [];
    const isRootDirectory = !rootPath && directoryEntry.fullPath;

    if (isRootDirectory) {
        rootPath = directoryEntry.fullPath;
        console.log('Root path set to:', rootPath);
        gitignoreRules = [];
        gitignoreFound = false;
    }

    if (isDirectoryIgnored(directoryEntry.fullPath)) {
        console.log('Skipping ignored directory completely:', directoryEntry.fullPath);
        return;
    }

    do {
        entries = await readEntries();

        if (!gitignoreFound) {
            for (const entry of entries) {
                if (entry.isFile && entry.name === '.gitignore') {
                    await new Promise(resolve => {
                        entry.file(async file => {
                            await parseGitignore(file);
                            resolve();
                        });
                    });
                    break;
                }
            }
        }

        for (const entry of entries) {
            if (entry.isDirectory) {
                if (!isDirectoryIgnored(entry.fullPath)) {
                    promises.push(readDirectoryEntries(entry, fileList));
                } else {
                    console.log('Ignored directory:', entry.fullPath);
                }
            }
        }

        for (const entry of entries) {
            if (entry.isFile && entry.name !== '.gitignore') {
                if (!isIgnored(entry.fullPath)) {
                    promises.push(new Promise(resolve => {
                        entry.file(file => {
                            file.relativePath = entry.fullPath;
                            fileList.push(file);
                            resolve();
                        });
                    }));
                } else {
                    console.log('Ignored file:', entry.fullPath);
                }
            }
        }
    } while (entries.length > 0);

    await Promise.all(promises);
};

const handleDropWithItems = async (items) => {
    loading.style.display = 'flex';
    loadingStatus.textContent = 'Đang quét files...';

    let newFiles = [];
    let promises = [];

    gitignoreRules = [];
    gitignoreFound = false;
    rootPath = '';

    for (const item of items) {
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry && entry.isFile && entry.name === '.gitignore') {
                await new Promise(resolve => {
                    entry.file(async file => {
                        await parseGitignore(file);
                        resolve();
                    });
                });
                break;
            }
        }
    }

    for (const item of items) {
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

            if (entry) {
                if (entry.isFile) {
                    if (entry.name === '.gitignore' && gitignoreFound) continue;
                    if (!isIgnored(entry.fullPath)) {
                        promises.push(new Promise(resolve => {
                            entry.file(file => {
                                file.relativePath = entry.fullPath;
                                newFiles.push(file);
                                resolve();
                            });
                        }));
                    }
                } else if (entry.isDirectory) {
                    if (!isDirectoryIgnored(entry.fullPath)) {
                        promises.push(readDirectoryEntries(entry, newFiles));
                    } else {
                        console.log('Skipped ignored directory:', entry.fullPath);
                    }
                }
            } else {
                const file = item.getAsFile();
                if (file) newFiles.push(file);
            }
        }
    }

    await Promise.all(promises);
    const textFiles = newFiles.filter(file => isTextFile(file));
    handleFiles(textFiles);
    loading.style.display = 'none';
};


const requestDirectoryAccess = async () => {
    try {
        if ('showDirectoryPicker' in window) {
            loading.style.display = 'flex';
            loadingStatus.textContent = 'Đang chọn thư mục...';

            const directoryHandle = await window.showDirectoryPicker();

            gitignoreRules = [];
            gitignoreFound = false;
            rootPath = '';

            try {
                const gitignoreFileHandle = await directoryHandle.getFileHandle('.gitignore');
                const gitignoreFile = await gitignoreFileHandle.getFile();
                await parseGitignore(gitignoreFile);
            } catch (err) {
                console.log('Không tìm thấy file .gitignore hoặc không thể đọc');
            }

            const fileHandles = [];

            const getFilesRecursively = async (directoryHandle, path = '') => {
                const currentPath = path || '/';
                const dirName = path.split('/').pop();

                const ignoredDirs = ['node_modules', 'vendor', '.git', 'dist', 'build', '.idea', '.vscode'];
                if (ignoredDirs.includes(dirName)) {
                    console.log('Bỏ qua thư mục phổ biến bị ignore:', path);
                    return;
                }

                if (path && isDirectoryIgnored(path)) {
                    console.log('Bỏ qua thư mục bị ignore:', path);
                    return;
                }

                try {
                    for await (const entry of directoryHandle.values()) {
                        const entryPath = path + '/' + entry.name;

                        if (entry.kind === 'file') {
                            if (entry.name === '.gitignore' && gitignoreFound) continue;

                            if (!isIgnored(entryPath)) {
                                fileHandles.push({ handle: entry, path: entryPath });
                            } else {
                                console.log('Bỏ qua file bị ignore:', entryPath);
                            }
                        } else if (entry.kind === 'directory') {
                            if (!isDirectoryIgnored(entryPath)) {
                                await getFilesRecursively(entry, entryPath);
                            } else {
                                console.log('Bỏ qua thư mục con bị ignore:', entryPath);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Lỗi khi đọc thư mục:', err);
                }
            };

            await getFilesRecursively(directoryHandle);
            loading.style.display = 'flex';
            loadingStatus.textContent = 'Đang đọc files...';
            const newFiles = [];

            for (let i = 0; i < fileHandles.length; i++) {
                const fileHandle = fileHandles[i];
                const file = await fileHandle.handle.getFile();
                file.relativePath = fileHandle.path;
                if (isTextFile(file)) {
                    newFiles.push(file);
                }
                loadingStatus.textContent = `Đang đọc files... (${i + 1}/${fileHandles.length})`;
            }
            handleFiles(newFiles);
        } else {
            alert('Trình duyệt của bạn không hỗ trợ chọn thư mục. Vui lòng kéo thả thư mục vào hoặc dùng trình duyệt Chrome/Edge mới nhất.');
        }
    } catch (err) {
        console.error('Error accessing directory:', err);
    } finally {
        loading.style.display = 'none';
    }
};

const handleFiles = (newFiles) => {
    files = [...files, ...newFiles];
    displayFileList();
    readFilesContent();
};


// --- UI Updates ---

const updateStats = () => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const charCount = textContent.value.length;
    const gitignoreStatus = gitignoreFound ? `| .gitignore: Có (${gitignoreRules.length} quy tắc)` : '';
    stats.textContent = `Files: ${files.length} | Tổng kích thước: ${formatFileSize(totalSize)} | Context: ${charCount.toLocaleString()} ký tự ${gitignoreStatus}`;
};

const displayFileList = () => {
    fileList.innerHTML = '';
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const fileInfo = document.createElement('div');
        const displayName = file.relativePath ? file.relativePath.substring(1) : file.name;
        fileInfo.innerHTML = `
        <div class="file-name" title="${displayName}">${displayName}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
        `;

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '✕';
        removeButton.className = 'copy-btn';
        removeButton.style.padding = '3px 8px';
        removeButton.onclick = (e) => {
            e.stopPropagation();
            removeFile(index);
        };

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeButton);
        fileList.appendChild(fileItem);
    });
    updateStats();
};
const removeFile = (index) => {
    files.splice(index, 1);
    displayFileList();
    readFilesContent();
};

const readFilesContent = async () => {
    textContent.value = '';
    if (files.length === 0) {
        updateStats();
        return;
    }

    loading.style.display = 'flex';
    try {
        const contents = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            loadingStatus.textContent = `Đang đọc file ${i + 1}/${files.length}: ${file.name}`;
            try {
                const content = await readFileAsync(file);
                const displayPath = file.relativePath ? file.relativePath.substring(1) : file.name;
                contents.push(`/* ===== ${displayPath} ===== */\n${content}\n\n`);
            } catch (error) {
                console.error('Error reading file:', file.name, error);
                contents.push(`/* Không thể đọc file: ${file.name} - ${error.message} */\n\n`);
            }
        }
        textContent.value = contents.join('');
        updateStats();
    } finally {
        loading.style.display = 'none';
    }
};


// --- Clipboard and Copy ---
const showCopySuccess = (success = true) => {
    if (success) {
        copySuccess.classList.add('show');
        setTimeout(() => copySuccess.classList.remove('show'), 2000);
    } else {
        alert("Không thể sao chép nội dung. Vui lòng thử lại.");
    }
};

const fallbackCopy = (blob) => {
    const textArea = document.createElement('textarea');
    textArea.value = URL.createObjectURL(blob);
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        showCopySuccess(successful);
    } catch (err) {
        console.error('Lỗi fallback copy:', err);
        showCopySuccess(false);
    }

    document.body.removeChild(textArea);
};

const copyContentToClipboard = async () => {
    const content = textContent.value;
    if (!content) return;

    try {
        const blob = new Blob([content], { type: 'text/plain' });
        if (navigator.clipboard && window.isSecureContext) {
            const data = [new ClipboardItem({ [blob.type]: blob })];
            await navigator.clipboard.write(data);
            showCopySuccess();
        } else {
            fallbackCopy(blob);
        }
    } catch (err) {
        console.error('Lỗi khi sao chép:', err);
        showCopySuccess(false);
    }
};

const handlePaste = async (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;

    if (clipboardData && clipboardData.files && clipboardData.files.length > 0) {
        const pastedFiles = [...clipboardData.files];
        loading.style.display = 'flex';
        loadingStatus.textContent = 'Đang xử lý files đã paste...';

        try {
            const textFiles = pastedFiles.filter((file) => isTextFile(file));
            textFiles.forEach((file) => {
                file.relativePath = null;
            });
            handleFiles(textFiles);
            console.log(`Đã paste ${textFiles.length} file văn bản`);
        } catch (error) {
            console.error('Lỗi khi xử lý files từ clipboard:', error);
        } finally {
            loading.style.display = 'none';
        }
    } else if (clipboardData && clipboardData.items && clipboardData.items.length > 0) {
        loading.style.display = 'flex';
        loadingStatus.textContent = 'Đang xử lý nội dung đã paste...';

        try {
            let newFiles = [];
            let promises = [];

            for (let i = 0; i < clipboardData.items.length; i++) {
                const item = clipboardData.items[i];

                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

                    if (entry) {
                        if (entry.isFile) {
                            promises.push(
                                new Promise((resolve) => {
                                    entry.file((file) => {
                                        newFiles.push(file);
                                        resolve();
                                    });
                                })
                            );
                        } else if (entry.isDirectory) {
                            promises.push(readDirectoryEntries(entry, newFiles));
                        }
                    } else {
                        const file = item.getAsFile();
                        if (file) newFiles.push(file);
                    }
                }
            }

            await Promise.all(promises);
            const textFiles = newFiles.filter((file) => isTextFile(file));
            handleFiles(textFiles);
            console.log(`Đã paste ${textFiles.length} file văn bản`);
        } catch (error) {
            console.error('Lỗi khi xử lý nội dung từ clipboard:', error);
        } finally {
            loading.style.display = 'none';
        }
    }
};


const tryAdvancedPaste = async () => {
    try {
        if ('clipboard' in navigator && 'read' in navigator.clipboard) {
            const clipboardItems = await navigator.clipboard.read();
            loading.style.display = 'flex';
            loadingStatus.textContent = 'Đang đọc clipboard...';
            let newFiles = [];

            for (const clipboardItem of clipboardItems) {
                for (const type of clipboardItem.types) {
                    if (type.startsWith('image/') || type.startsWith('text/') || type.startsWith('application/')) {
                        const blob = await clipboardItem.getType(type);
                        const file = new File([blob], `pasted_${Date.now()}.${getExtensionFromMime(type)}`, { type: blob.type });
                        if (isTextFile(file)) newFiles.push(file);
                    }
                }
            }

            if (newFiles.length > 0) {
                handleFiles(newFiles);
                return true;
            }
        }
    } catch (error) {
        console.log('Advanced clipboard API not supported or failed:', error);
        return false;
    } finally {
        loading.style.display = 'none';
    }
    return false;
};


// --- Event Listeners ---

// Drag and Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});
dropArea.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    if (dt.items) {
        await handleDropWithItems(dt.items);
    } else {
        handleFiles([...dt.files]);
    }
});

// File Input
fileInput.addEventListener('change', () => {
    const newFiles = [...fileInput.files];
    handleFiles(newFiles);
});

// Clear Button
clearBtn.addEventListener('click', () => {
    files = [];
    displayFileList();
    textContent.value = '';
    updateStats();
});

// Copy Button
copyBtn.addEventListener('click', copyContentToClipboard);

// Paste
textContent.addEventListener('input', updateStats);
document.addEventListener('paste', handlePaste);
// Initialize Drop Area Text
if (dropAreaText) {
    dropAreaText.innerHTML = 'Kéo thả files hoặc folders vào đây<br><small>hoặc paste (Ctrl+V) từ File Explorer</small>';
}
// Set focus on body after any click
document.body.addEventListener('click', () => {
    document.body.focus()
});
