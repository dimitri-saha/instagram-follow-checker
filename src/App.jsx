import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Upload, UserX, AlertCircle, FileArchive, CheckCircle2, Instagram, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const App = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFollowingBack, setNotFollowingBack] = useState([]);
  const [processed, setProcessed] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const onFileSelect = (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const extractUsernames = (data) => {
    const users = new Map();

    const traverse = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      // PATTERN 1: Standard object with string_list_data
      // This matches the user's provided snippet where "title" is the username
      if (obj.string_list_data && Array.isArray(obj.string_list_data)) {
        const firstEntry = obj.string_list_data[0];

        // Case A: Username is in 'title' (User's specific format)
        if (obj.title) {
          users.set(obj.title, {
            username: obj.title,
            href: firstEntry?.href || `https://www.instagram.com/${obj.title}`
          });
          return; // Stop traversing this branch
        }

        // Case B: Username is in 'value' inside string_list_data (Older formats)
        obj.string_list_data.forEach(entry => {
          if (entry.value) {
            users.set(entry.value, {
              username: entry.value,
              href: entry.href || `https://www.instagram.com/${entry.value}`
            });
          }
        });
        return;
      }

      // PATTERN 2: Direct value object (Flat format)
      if (obj.value && obj.href && obj.timestamp) {
        users.set(obj.value, {
          username: obj.value,
          href: obj.href
        });
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else {
        Object.values(obj).forEach(traverse);
      }
    };

    traverse(data);
    return users;
  };

  const processFile = async (file) => {
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      setError('Please upload a valid ZIP file.');
      return;
    }

    setLoading(true);
    setError(null);
    setProcessed(false);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      const fileNames = Object.keys(contents.files);

      // Helper to find best matching file
      const findFile = (patterns) => {
        // First try to find in the correct path
        const exactMatch = fileNames.find(name =>
          name.includes('connections/followers_and_following/') &&
          patterns.some(p => name.endsWith(p))
        );
        if (exactMatch) return exactMatch;

        // Fallback to searching anywhere
        return fileNames.find(name =>
          patterns.some(p => name.endsWith(p)) || patterns.some(p => name.includes(p))
        );
      };

      const followersFile = findFile(['followers_1.json', 'followers.json']);
      const followingFile = findFile(['following.json']);

      if (!followersFile || !followingFile) {
        throw new Error('Could not find "followers_1.json" or "following.json" in the zip file. Please make sure you downloaded the correct data from Instagram (Connections > Followers and following).');
      }

      const followersText = await contents.files[followersFile].async('text');
      const followingText = await contents.files[followingFile].async('text');

      const followersData = JSON.parse(followersText);
      const followingData = JSON.parse(followingText);

      const followersMap = extractUsernames(followersData);
      const followingMap = extractUsernames(followingData);

      const notFollowingBackList = [];

      followingMap.forEach((user, username) => {
        if (!followersMap.has(username)) {
          notFollowingBackList.push(user);
        }
      });

      setNotFollowingBack(notFollowingBackList);
      setStats({
        followers: followersMap.size,
        following: followingMap.size
      });
      setProcessed(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while processing the file.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setProcessed(false);
    setNotFollowingBack([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 mb-4 ring-1 ring-indigo-500/20">
            <Instagram className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Instagram Unfollowers
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Upload your Instagram data zip file to see who you follow but doesn't follow you back.
            Your data is processed locally in your browser and never uploaded anywhere.
          </p>
        </header>

        {!processed && (
          <div className="max-w-2xl mx-auto">
            <div
              className={cn(
                "relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ease-in-out text-center",
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]"
                  : "border-slate-700 hover:border-indigo-500/50 hover:bg-slate-900/50 bg-slate-900/20"
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={onFileSelect}
              />

              <div className="flex flex-col items-center gap-6">
                <div className={cn(
                  "p-6 rounded-full transition-colors duration-300",
                  isDragging ? "bg-indigo-500/20" : "bg-slate-800 group-hover:bg-slate-800/80"
                )}>
                  {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
                  ) : (
                    <FileArchive className={cn(
                      "w-12 h-12 transition-colors duration-300",
                      isDragging ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-400"
                    )} />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    {loading ? 'Processing...' : 'Drop your ZIP file here'}
                  </h3>
                  <p className="text-slate-400">
                    or <span className="text-indigo-400 font-medium">click to browse</span>
                  </p>
                </div>

                {!loading && (
                  <div className="text-xs text-slate-500 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
                    Supports standard Instagram data export
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="mt-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">How to get your Instagram ZIP</h2>
              </div>
              <div className="space-y-4 text-slate-300">
                <div>
                  <p className="text-slate-400 text-sm mb-2">On web</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-200">
                    <li>Open <a className="text-indigo-400 hover:underline" target="_blank" rel="noreferrer" href="https://accountscenter.instagram.com/info_and_permissions/dyi">Accounts Center → Download your information</a>.</li>
                    <li>Choose “Some of your information”.</li>
                    <li>Under Categories, select only “Followers and following”.</li>
                    <li>Set format to JSON and create file.</li>
                    <li>When it’s ready, download the ZIP and upload it here.</li>
                  </ol>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-2">On mobile app</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-200">
                    <li>Profile → menu → Settings and privacy.</li>
                    <li>Accounts Center → Your information and permissions.</li>
                    <li>Download your information → Some of your information.</li>
                    <li>Select only “Followers and following”, format JSON.</li>
                    <li>Create file, wait for notification, download the ZIP.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {processed && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <div className="flex gap-8 text-center md:text-left">
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Following</p>
                  <p className="text-3xl font-bold text-white">{stats.following}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Followers</p>
                  <p className="text-3xl font-bold text-white">{stats.followers}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Not Following Back</p>
                  <p className="text-3xl font-bold text-indigo-400">{notFollowingBack.length}</p>
                </div>
              </div>

              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors duration-200 border border-slate-700"
              >
                Check Another File
              </button>
            </div>

            {notFollowingBack.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-slate-800/50">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Everyone follows you back!</h3>
                <p className="text-slate-400">You have a healthy following ratio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {notFollowingBack.map((user) => (
                  <a
                    key={user.username}
                    href={user.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative bg-slate-900/40 hover:bg-slate-800/60 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all duration-300 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                      <UserX className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                        {user.username}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">View Profile</p>
                    </div>
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-indigo-500/20 pointer-events-none" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
