import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [summaryLength, setSummaryLength] = useState("medium");

  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------
  // FILE VALIDATION
  // ---------------------------------------------------------

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return;
    }

    setFile(selectedFile);
    setError("");

    setSummary("");
    setKeyPoints([]);
    setSuggestions([]);
  };

  const handleInputChange = (event) => {
    const selectedFile = event.target.files[0];

    handleFileChange(selectedFile);

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files[0];

    handleFileChange(droppedFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // ---------------------------------------------------------
  // RESET DOCUMENT
  // ---------------------------------------------------------

  const handleReset = () => {
    setFile(null);
    setSummary("");
    setKeyPoints([]);
    setSuggestions([]);
    setError("");
    setSummaryLength("medium");
  };

  // ---------------------------------------------------------
  // TEXT CLEANING
  // ---------------------------------------------------------

  const cleanText = (text) => {
    if (!text) return "";

    return text
      // Remove Markdown bold
      .replace(/\*\*(.*?)\*\*/g, "$1")

      // Remove Markdown italic
      .replace(/(?<!\*)\*([^\n*]+)\*(?!\*)/g, "$1")

      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")

      // Remove decorative bullet characters
      .replace(/^[ \t]*[-*•●▪]\s+/gm, "")

      // Remove excessive spaces
      .replace(/[ \t]+/g, " ")

      // Remove spaces at beginning of lines
      .replace(/^[ \t]+/gm, "")

      // Remove excessive blank lines
      .replace(/\n{3,}/g, "\n\n")

      .trim();
  };

  // ---------------------------------------------------------
  // CLEAN LIST ITEMS
  // ---------------------------------------------------------

  const cleanList = (text) => {
    if (!text) return [];

    return text
      .split("\n")
      .map((item) => {
        let cleaned = item.trim();

        // Remove bullet characters
        cleaned = cleaned.replace(/^[-*•●▪]\s+/, "");

        // Remove numbering added by AI
        cleaned = cleaned.replace(/^\d+[.)]\s+/, "");

        // Remove Markdown bold
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");

        // Remove Markdown italic
        cleaned = cleaned.replace(
          /(?<!\*)\*([^\n*]+)\*(?!\*)/g,
          "$1"
        );

        // Remove inline code
        cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

        // Remove excessive spaces
        cleaned = cleaned.replace(/[ \t]+/g, " ").trim();

        return cleaned;
      })
      .filter((item) => {
        if (!item) return false;

        if (/^\d+$/.test(item)) return false;

        return true;
      });
  };

  // ---------------------------------------------------------
  // PARSE AI RESPONSE
  // ---------------------------------------------------------

  const parseResult = (result) => {
    if (!result || typeof result !== "string") {
      return {
        summary: "",
        keyPoints: [],
        suggestions: [],
      };
    }

    const normalizedResult = result
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    // -------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------

    const summaryMatch = normalizedResult.match(
      /SUMMARY:\s*([\s\S]*?)(?=\n\s*KEY POINTS:\s*|\n\s*IMPROVEMENT SUGGESTIONS:\s*|$)/i
    );

    // -------------------------------------------------------
    // KEY POINTS
    // -------------------------------------------------------

    const keyPointsMatch = normalizedResult.match(
      /KEY POINTS:\s*([\s\S]*?)(?=\n\s*IMPROVEMENT SUGGESTIONS:\s*|$)/i
    );

    // -------------------------------------------------------
    // IMPROVEMENT SUGGESTIONS
    // -------------------------------------------------------

    const suggestionsMatch = normalizedResult.match(
      /IMPROVEMENT SUGGESTIONS:\s*([\s\S]*)$/i
    );

    // -------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------

    let finalSummary = "";

    if (summaryMatch && summaryMatch[1]) {
      finalSummary = cleanText(summaryMatch[1]);
    } else {
      finalSummary = cleanText(normalizedResult);
    }

    // -------------------------------------------------------
    // FINAL LISTS
    // -------------------------------------------------------

    const finalKeyPoints = cleanList(
      keyPointsMatch ? keyPointsMatch[1] : ""
    );

    const finalSuggestions = cleanList(
      suggestionsMatch ? suggestionsMatch[1] : ""
    );

    return {
      summary: finalSummary,
      keyPoints: finalKeyPoints,
      suggestions: finalSuggestions,
    };
  };

  // ---------------------------------------------------------
  // GENERATE SUMMARY
  // ---------------------------------------------------------

  const handleGenerateSummary = async () => {
    if (!file) {
      setError("Please upload a document first.");
      return;
    }

    setLoading(true);
    setError("");

    setSummary("");
    setKeyPoints([]);
    setSuggestions([]);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "https://document-summary-assisstant-2.onrender.com";

      const response = await fetch(
        `${API_BASE_URL}/summarize?summary_length=${summaryLength}`,
        {
          method: "POST",
          body: formData,
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to generate summary."
        );
      }

      if (!data.result) {
        throw new Error(
          "The server did not return a summary."
        );
      }

      const parsed = parseResult(data.result);

      setSummary(parsed.summary);
      setKeyPoints(parsed.keyPoints);
      setSuggestions(parsed.suggestions);
    } catch (err) {
      console.error("Summary generation error:", err);

      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the backend. Make sure your FastAPI server is running on https://document-summary-assisstant-2.onrender.com."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong while processing the document."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <header className="header">
          <div className="badge">
            AI DOCUMENT ANALYSIS
          </div>

          <h1>Document Summary Assistant</h1>

          <p>
            Transform your documents into concise,
            actionable insights using AI.
          </p>
        </header>

        {/* Upload Area */}
        <div
          className={`upload-box ${
            file ? "has-file" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="document-icon">
            📄
          </div>

          <h2>
            {file
              ? file.name
              : "Upload your document"}
          </h2>

          {!file && (
            <>
              <p>
                Drag & drop your PDF or image here
              </p>

              <p className="or">or</p>
            </>
          )}

          <label className="browse-button">
            {file
              ? "Choose Another File"
              : "Browse Files"}

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleInputChange}
              hidden
            />
          </label>

          <p className="formats">
            Supported formats: PDF, PNG, JPG, JPEG
            {" • "}
            Max 10 MB
          </p>

          {file && (
            <div className="selected-file">
              <span>✓</span>
              {file.name}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Summary Options */}
        <section className="summary-options">
          <h2>Choose Summary Length</h2>

          <div className="length-buttons">

            <button
              className={
                summaryLength === "short"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSummaryLength("short")
              }
              type="button"
            >
              <strong>Short</strong>
              <span>Quick overview</span>
            </button>

            <button
              className={
                summaryLength === "medium"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSummaryLength("medium")
              }
              type="button"
            >
              <strong>Medium</strong>
              <span>Balanced detail</span>
            </button>

            <button
              className={
                summaryLength === "long"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSummaryLength("long")
              }
              type="button"
            >
              <strong>Long</strong>
              <span>Detailed analysis</span>
            </button>

          </div>
        </section>

        {/* Generate Button */}
        <button
          className="generate-button"
          onClick={handleGenerateSummary}
          disabled={loading || !file}
          type="button"
        >
          {loading
            ? "Analyzing Document..."
            : "Generate AI Summary"}
        </button>

        {/* Loading */}
        {loading && (
          <div className="loading-box">
            <div className="spinner"></div>

            <div>
              <strong>
                Analyzing your document
              </strong>

              <p>
                Extracting content and generating
                AI insights...
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && summary && (
          <section className="results">

            {/* Results Header */}
            <div className="results-header">
              <div>
                <span className="results-label">
                  ANALYSIS COMPLETE
                </span>

                <h2>Document Insights</h2>
              </div>

              <span className="length-badge">
                {summaryLength.toUpperCase()}
              </span>
            </div>

            {/* AI Summary */}
            <div className="result-card summary-card">

              <div className="card-heading">
                <div>
                  <h3>AI Summary</h3>

                  <p>
                    Core information from your
                    document
                  </p>
                </div>
              </div>

              <p className="summary-text">
                {summary}
              </p>
            </div>

            {/* Key Points */}
            {keyPoints.length > 0 && (
              <div className="result-card">

                <div className="card-heading">
                  <div>
                    <h3>Key Points</h3>

                    <p>
                      Important information
                      identified by AI
                    </p>
                  </div>
                </div>

                <div className="points-list">
                  {keyPoints.map(
                    (point, index) => (
                      <div
                        className="point-item"
                        key={`${index}-${point}`}
                      >
                        <span className="point-number">
                          {index + 1}
                        </span>

                        <p>{point}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="result-card">

                <div className="card-heading">
                  <div>
                    <h3>
                      Improvement Suggestions
                    </h3>

                    <p>
                      Actionable recommendations
                      from the analysis
                    </p>
                  </div>
                </div>

                <div className="suggestions-list">
                  {suggestions.map(
                    (suggestion, index) => (
                      <div
                        className="suggestion-item"
                        key={`${index}-${suggestion}`}
                      >
                        <span className="suggestion-number">
                          {index + 1}
                        </span>

                        <p>{suggestion}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* New Document */}
            <button
              className="generate-button"
              onClick={handleReset}
              type="button"
            >
              Start New Document
            </button>

          </section>
        )}

      </div>
    </div>
  );
}

export default App;