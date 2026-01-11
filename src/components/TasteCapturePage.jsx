import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mic, Square, Play, Pause, Loader2, Sparkles, Check, ChevronRight, PenLine, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TASTE_QUESTIONS = [
  {
    category: 'why_i_read',
    title: 'The WHY',
    questions: [
      {
        id: 'why_read',
        prompt: "What does reading do for you? Why do you read? What are you seeking?",
        hint: "Think about what draws you to pick up a book..."
      },
      {
        id: 'cost_something',
        prompt: "When a book 'costs something to read,' what does that feel like? Can you describe a specific moment?",
        hint: "A book that left you changed, not just entertained..."
      },
      {
        id: 'enjoyed_vs_changed',
        prompt: "What's the difference between a book you enjoyed and a book that changed you?",
        hint: "Think of examples of each..."
      }
    ]
  },
  {
    category: 'quality_lens',
    title: 'The Quality Lens',
    questions: [
      {
        id: 'pick_up',
        prompt: "What makes you pick up a book? First page test? Cover? Recommendation?",
        hint: "Your personal selection process..."
      },
      {
        id: 'put_down',
        prompt: "What makes you put a book down? What are your dealbreakers?",
        hint: "Flat characters? Poor prose? Something else?"
      },
      {
        id: 'outside_genre',
        prompt: "If someone asked for a genre you don't typically read (sci-fi, fantasy, horror), what would make you say 'THIS is a good one'?",
        hint: "What transcends genre for you?"
      }
    ]
  },
  {
    category: 'voice',
    title: 'The Voice',
    questions: [
      {
        id: 'how_sound',
        prompt: "How do you want to sound when recommending books? Warm friend? Knowledgeable curator? Book club host?",
        hint: "Your natural recommendation style..."
      },
      {
        id: 'guilty_pleasure',
        prompt: "What's your guilty pleasure? Is there something you love that doesn't fit your 'brand'?",
        hint: "Be honest - no judgment here!"
      },
      {
        id: 'phrases',
        prompt: "What phrases do you naturally use when talking about books?",
        hint: "e.g., 'This one gutted me,' 'It stayed with me for weeks'..."
      }
    ]
  },
  {
    category: 'emotional_palette',
    title: 'The Emotional Palette',
    questions: [
      {
        id: 'want_to_feel',
        prompt: "What emotions do you WANT to feel when reading?",
        hint: "Transformed? Challenged? Comforted? All of the above?"
      },
      {
        id: 'avoid_feeling',
        prompt: "What emotions do you AVOID in books?",
        hint: "Anxiety? Hopelessness? Boredom?"
      },
      {
        id: 'chasing',
        prompt: "Is there a feeling you're always chasing in books?",
        hint: "The thing that keeps you coming back..."
      }
    ]
  }
];

function InputCapture({ onRecordingComplete, onTextSubmit, isTranscribing, isSaving }) {
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [textInput, setTextInput] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextSubmit(textInput.trim());
      setTextInput('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Try to use webm, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob, duration);
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isTranscribing || isSaving) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="w-12 h-12 text-[#5F7252] animate-spin" />
        <p className="text-[#5F7252]">
          {isTranscribing ? 'Transcribing your thoughts...' : 'Saving...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-[#F0EDE5] rounded-full">
        <button
          onClick={() => setMode('voice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            mode === 'voice' 
              ? 'bg-white text-[#4A5940] shadow-sm' 
              : 'text-[#7A8F6C] hover:text-[#5F7252]'
          }`}
        >
          <Mic className="w-4 h-4" />
          Voice
        </button>
        <button
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            mode === 'text' 
              ? 'bg-white text-[#4A5940] shadow-sm' 
              : 'text-[#7A8F6C] hover:text-[#5F7252]'
          }`}
        >
          <PenLine className="w-4 h-4" />
          Type
        </button>
      </div>

      {mode === 'voice' ? (
        <>
          {isRecording ? (
            <>
              <div className="text-4xl font-mono text-[#4A5940]">{formatTime(duration)}</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[#5F7252]">Recording...</span>
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </button>
            </>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-[#5F7252] text-white rounded-full hover:bg-[#4A5940] transition-colors"
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </button>
          )}
          <p className="text-sm text-[#7A8F6C]">
            {isRecording ? 'Speak naturally - take your time' : 'Tap to record your answer'}
          </p>
        </>
      ) : (
        <>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your thoughts here..."
            className="w-full h-32 p-4 border border-[#D4DAD0] rounded-xl text-[#4A5940] placeholder-[#A0A89C] focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent resize-none"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-[#5F7252] text-white rounded-full hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            Submit Answer
          </button>
        </>
      )}
    </div>
  );
}

function AudioPlayer({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#F0EDE5] rounded-lg">
      <audio ref={audioRef} src={audioUrl} />
      <button
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center bg-[#5F7252] text-white rounded-full hover:bg-[#4A5940] transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-[#D4DAD0] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#5F7252] transition-all"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>
      <span className="text-sm text-[#5F7252] font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

function MomentCard({ moment, onGenerateGlimpse }) {
  const [showGlimpse, setShowGlimpse] = useState(false);
  const [generatingGlimpse, setGeneratingGlimpse] = useState(false);

  const handleGenerateGlimpse = async () => {
    setGeneratingGlimpse(true);
    await onGenerateGlimpse(moment.id);
    setGeneratingGlimpse(false);
    setShowGlimpse(true);
  };

  return (
    <div className="bg-white rounded-xl border border-[#D4DAD0] p-4 shadow-sm">
      <div className="text-sm text-[#7A8F6C] mb-2">{moment.capture_prompt}</div>
      
      {moment.audio_url && (
        <AudioPlayer audioUrl={moment.audio_url} />
      )}
      
      {moment.transcript && (
        <div className="mt-3 p-3 bg-[#F8F6EE] rounded-lg">
          <p className="text-sm text-[#4A5940] italic">"{moment.transcript}"</p>
        </div>
      )}
      
      {moment.glimpse_feeling && showGlimpse && (
        <div className="mt-3 p-3 bg-gradient-to-r from-[#F8F6EE] to-[#F0EDE5] rounded-lg border border-[#D4DAD0]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#5F7252]" />
            <span className="text-sm font-medium text-[#4A5940]">AI Glimpse</span>
          </div>
          <p className="text-sm text-[#5F7252]">
            <strong>Feeling:</strong> {moment.glimpse_feeling}
          </p>
          <p className="text-sm text-[#5F7252] mt-1">{moment.glimpse_observation}</p>
        </div>
      )}
      
      {moment.transcript && !moment.glimpse_feeling && (
        <button
          onClick={handleGenerateGlimpse}
          disabled={generatingGlimpse}
          className="mt-3 flex items-center gap-2 text-sm text-[#5F7252] hover:text-[#4A5940] transition-colors"
        >
          {generatingGlimpse ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generatingGlimpse ? 'Generating...' : 'Show AI insight'}
        </button>
      )}
      
      {moment.glimpse_feeling && !showGlimpse && (
        <button
          onClick={() => setShowGlimpse(true)}
          className="mt-3 flex items-center gap-2 text-sm text-[#5F7252] hover:text-[#4A5940] transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Show saved insight
        </button>
      )}
    </div>
  );
}

export default function TasteCapturePage({ user, onNavigate }) {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [moments, setMoments] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const currentCategory = TASTE_QUESTIONS[currentCategoryIndex];
  const currentQuestion = currentCategory?.questions[currentQuestionIndex];
  const totalQuestions = TASTE_QUESTIONS.reduce((sum, cat) => sum + cat.questions.length, 0);
  const answeredQuestions = moments.length;

  useEffect(() => {
    if (user) {
      loadMoments();
    }
  }, [user]);

  const loadMoments = async () => {
    const { data, error } = await supabase
      .from('reading_moments')
      .select('*')
      .eq('user_id', user.id)
      .eq('capture_type', 'taste_capture')
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Get signed URLs for audio
      const momentsWithUrls = await Promise.all(data.map(async (moment) => {
        if (moment.audio_path) {
          const { data: urlData } = await supabase.storage
            .from('moments')
            .createSignedUrl(moment.audio_path, 3600);
          return { ...moment, audio_url: urlData?.signedUrl };
        }
        return moment;
      }));
      setMoments(momentsWithUrls);
    }
  };

  const handleRecordingComplete = async (blob, duration) => {
    if (!user || !currentQuestion) return;
    
    setIsTranscribing(true);
    setError(null);

    try {
      // 1. Upload audio to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('moments')
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Create database record
      const { data: moment, error: insertError } = await supabase
        .from('reading_moments')
        .insert({
          user_id: user.id,
          capture_type: 'taste_capture',
          capture_category: currentCategory.category,
          capture_prompt: currentQuestion.prompt,
          audio_path: fileName,
          audio_duration_seconds: duration
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Transcribe via API
      const { data: signedUrlData } = await supabase.storage
        .from('moments')
        .createSignedUrl(fileName, 3600);

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioUrl: signedUrlData.signedUrl,
          momentId: moment.id 
        })
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const { transcript } = await transcribeResponse.json();

      // 4. Update moment with transcript
      await supabase
        .from('reading_moments')
        .update({ 
          transcript,
          transcribed_at: new Date().toISOString()
        })
        .eq('id', moment.id);

      // 5. Reload moments and advance to next question
      await loadMoments();
      advanceToNextQuestion();

    } catch (err) {
      console.error('Error saving moment:', err);
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const advanceToNextQuestion = () => {
    if (currentQuestionIndex < currentCategory.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentCategoryIndex < TASTE_QUESTIONS.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setCurrentQuestionIndex(0);
    }
    // If we're at the last question, stay there
  };

  const handleTextSubmit = async (text) => {
    if (!user || !currentQuestion) return;
    
    setIsSaving(true);
    setError(null);

    try {
      // Create database record with text directly (no audio)
      const { error: insertError } = await supabase
        .from('reading_moments')
        .insert({
          user_id: user.id,
          capture_type: 'taste_capture',
          capture_category: currentCategory.category,
          capture_prompt: currentQuestion.prompt,
          input_type: 'text',
          transcript: text,
          transcribed_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Reload moments and advance to next question
      await loadMoments();
      advanceToNextQuestion();

    } catch (err) {
      console.error('Error saving text moment:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateGlimpse = async (momentId) => {
    const moment = moments.find(m => m.id === momentId);
    if (!moment?.transcript) return;

    try {
      const response = await fetch('/api/generate-glimpse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: moment.transcript,
          context: 'taste_framework',
          prompt: moment.capture_prompt
        })
      });

      if (!response.ok) throw new Error('Glimpse generation failed');

      const { feeling, observation } = await response.json();

      await supabase
        .from('reading_moments')
        .update({
          glimpse_feeling: feeling,
          glimpse_observation: observation,
          glimpse_generated_at: new Date().toISOString(),
          glimpse_saved: true
        })
        .eq('id', momentId);

      await loadMoments();
    } catch (err) {
      console.error('Error generating glimpse:', err);
    }
  };

  const isComplete = answeredQuestions >= totalQuestions;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-4">Sign in to continue</h2>
          <p className="text-[#5F7252]">You need to be signed in to record your taste framework.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      {/* Header */}
      <div className="bg-white border-b border-[#D4DAD0] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-serif text-2xl text-[#4A5940]">Taste Framework Capture</h1>
          <p className="text-sm text-[#7A8F6C] mt-1">
            {answeredQuestions} of {totalQuestions} questions answered
          </p>
          <div className="mt-2 h-2 bg-[#F0EDE5] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5F7252] transition-all duration-300"
              style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Current Question */}
        {!isComplete && currentQuestion && (
          <div className="bg-white rounded-2xl border border-[#D4DAD0] p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-[#F0EDE5] text-[#5F7252] text-sm font-medium rounded-full">
                {currentCategory.title}
              </span>
              <span className="text-sm text-[#7A8F6C]">
                Question {currentQuestionIndex + 1} of {currentCategory.questions.length}
              </span>
            </div>
            
            <h2 className="font-serif text-xl text-[#4A5940] mb-2">
              {currentQuestion.prompt}
            </h2>
            <p className="text-sm text-[#7A8F6C] mb-6">
              {currentQuestion.hint}
            </p>

            <InputCapture 
              onRecordingComplete={handleRecordingComplete}
              onTextSubmit={handleTextSubmit}
              isTranscribing={isTranscribing}
              isSaving={isSaving}
            />

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <div className="bg-gradient-to-r from-[#5F7252] to-[#4A5940] rounded-2xl p-6 text-white mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif text-xl">All Done!</h2>
                <p className="text-white/80 text-sm">You've answered all {totalQuestions} questions</p>
              </div>
            </div>
            <p className="text-white/90">
              Your taste framework is now captured. Review your answers below, 
              or generate AI insights to see patterns in your responses.
            </p>
          </div>
        )}

        {/* Category Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TASTE_QUESTIONS.map((cat, idx) => {
            const categoryMoments = moments.filter(m => m.capture_category === cat.category);
            const isCurrentCategory = idx === currentCategoryIndex;
            const isCompleteCategory = categoryMoments.length >= cat.questions.length;
            
            return (
              <button
                key={cat.category}
                onClick={() => {
                  setCurrentCategoryIndex(idx);
                  setCurrentQuestionIndex(0);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isCurrentCategory
                    ? 'bg-[#5F7252] text-white'
                    : isCompleteCategory
                      ? 'bg-[#D4DAD0] text-[#4A5940]'
                      : 'bg-[#F0EDE5] text-[#5F7252] hover:bg-[#E5E2DA]'
                }`}
              >
                {isCompleteCategory && <Check className="w-4 h-4" />}
                {cat.title}
              </button>
            );
          })}
        </div>

        {/* Recorded Moments */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg text-[#4A5940]">Your Recorded Answers</h3>
          
          {moments.length === 0 ? (
            <p className="text-[#7A8F6C] text-sm">
              No recordings yet. Start by answering the question above!
            </p>
          ) : (
            moments.map(moment => (
              <MomentCard 
                key={moment.id} 
                moment={moment}
                onGenerateGlimpse={handleGenerateGlimpse}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
