
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MODEL_URL, PEST_CONTROL_DATA } from './constants';
import type { Prediction, PestInfo } from './types';

// SVG Icon Components
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const LeafIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// --- Sub-components defined outside the main App component ---

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, isLoading }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <label htmlFor="image-upload" className={`
        inline-flex items-center justify-center px-6 py-3 border border-transparent 
        text-base font-medium rounded-md shadow-sm text-white 
        bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-green-500 cursor-pointer transition-transform transform hover:scale-105
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        <UploadIcon className="w-6 h-6 mr-3" />
        {isLoading ? '분석 중...' : '해충 이미지 업로드'}
      </label>
      <input
        id="image-upload"
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isLoading}
      />
    </div>
  );
};

interface ProgressBarProps {
    label: string;
    probability: number;
    isTop: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, probability, isTop }) => {
    const percentage = (probability * 100).toFixed(1);
    const barColor = isTop ? 'bg-green-500' : 'bg-green-300';
    const textColor = isTop ? 'text-green-800 font-bold' : 'text-gray-700';

    return (
        <div className="w-full mb-3">
            <div className={`flex justify-between items-center mb-1 ${textColor}`}>
                <span className="text-sm">{label}</span>
                <span className="text-sm font-semibold">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                    className={`${barColor} h-2.5 rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

interface AnalysisDisplayProps {
    predictions: Prediction[];
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ predictions }) => {
    const topPrediction = useMemo(() => {
        if (!predictions || predictions.length === 0) return null;
        return [...predictions].sort((a, b) => b.probability - a.probability)[0];
    }, [predictions]);

    const controlInfo = topPrediction ? PEST_CONTROL_DATA[topPrediction.className] : null;

    if (!topPrediction) return null;

    return (
        <div className="w-full space-y-8">
            {/* Results Section */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">분석 결과</h2>
                <div>
                    {predictions.map((p) => (
                        <ProgressBar 
                            key={p.className} 
                            label={p.className} 
                            probability={p.probability}
                            isTop={p.className === topPrediction.className}
                        />
                    ))}
                </div>
            </div>

            {/* Control Info Section */}
            {controlInfo && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                        <span className="text-green-600">{topPrediction.className}</span> 방제 방법
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">{controlInfo.description}</p>
                    <div className="space-y-4">
                        {controlInfo.methods.map((method, index) => (
                            <div key={index}>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">{method.title}</h3>
                                <ul className="space-y-1 pl-4">
                                    {method.content.map((item, itemIndex) => (
                                        <li key={itemIndex} className="text-gray-600 list-disc list-inside">{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main App Component ---

export default function App() {
  const [model, setModel] = useState<any | null>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    try {
      setError(null);
      const modelURL = MODEL_URL + "model.json";
      const metadataURL = MODEL_URL + "metadata.json";
      const loadedModel = await (window as any).tmImage.load(modelURL, metadataURL);
      setModel(loadedModel);
    } catch (err) {
      console.error("Failed to load model:", err);
      setError("모델을 불러오는 데 실패했습니다. 페이지를 새로고침 해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const predictImage = useCallback(async (imageElement: HTMLImageElement) => {
    if (!model) {
        setError("모델이 로드되지 않았습니다.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const predictionResult: Prediction[] = await model.predict(imageElement);
      setPredictions(predictionResult);
    } catch (err) {
      console.error("Prediction failed:", err);
      setError("이미지 분석 중 오류가 발생했습니다. 다른 이미지를 시도해 주세요.");
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [model]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImageURL(url);
      setPredictions([]);
      
      const imageElement = new Image();
      imageElement.src = url;
      imageElement.onload = () => {
          predictImage(imageElement);
      };
      imageElement.onerror = () => {
          setError("이미지를 불러오는 데 실패했습니다.");
      }
    };
    reader.onerror = () => {
        setError("파일을 읽는 중 오류가 발생했습니다.");
    }
    reader.readAsDataURL(file);
  }, [predictImage]);

  return (
    <div className="bg-slate-50 min-h-screen text-gray-800 antialiased">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center">
            <LeafIcon className="w-12 h-12 text-green-600 mr-4"/>
            <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
              산림 해충 판별 및 방제 안내 AI
            </h1>
          </div>
          <p className="mt-4 text-lg text-gray-500">
            해충 이미지를 업로드하여 종류를 판별하고, 효과적인 방제 방법을 확인하세요.
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto flex flex-col items-center space-y-8">
          
          <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <ImageUploader onImageUpload={handleImageUpload} isLoading={isLoading} />
          </div>
          
          {error && (
            <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center" role="alert">
              <strong className="font-bold">오류: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {!imageURL && !isLoading && !error && (
             <div className="text-center text-gray-500 p-10 border-2 border-dashed border-gray-300 rounded-xl w-full">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">이미지 대기 중</h3>
                <p className="mt-1 text-sm text-gray-500">
                    위 버튼을 눌러 해충 이미지를 업로드해주세요.
                </p>
            </div>
          )}

          {imageURL && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Image Preview */}
              <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex flex-col items-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">업로드된 이미지</h2>
                <img 
                  src={imageURL} 
                  alt="Uploaded Pest" 
                  className="rounded-lg object-contain h-80 w-full"
                />
              </div>

              {/* Analysis Results */}
              <div className="flex flex-col items-center">
                {isLoading && !predictions.length ? (
                    <div className="w-full bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">AI가 이미지를 분석하고 있습니다...</p>
                    </div>
                ) : (
                   <AnalysisDisplay predictions={predictions} />
                )}
              </div>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Forest Pest AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
