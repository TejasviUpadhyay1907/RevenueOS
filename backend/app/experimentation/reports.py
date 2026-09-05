"""
Experiment report generation for RevenueOS.
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

def generate_report(seed: int, baseline_metrics: Dict[str, Any], revenueos_metrics: Dict[str, Any], sample_size: Optional[int] = None) -> Dict[str, Any]:
    """
    Generate an experiment report comparing baseline and RevenueOS strategies.

    Args:
        seed: Random seed used for the experiment
        baseline_metrics: Metrics dict from the baseline strategy
        revenueos_metrics: Metrics dict from the RevenueOS strategy
        sample_size: Number of events processed (if None, use from metrics)

    Returns:
        A dict representing the report, suitable for JSON serialization.
    """
    if sample_size is None:
        sample_size = baseline_metrics.get("events_processed", 0)

    incremental_recovered = revenueos_metrics["total_recovered"] - baseline_metrics["total_recovered"]
    incremental_rate = revenueos_metrics["recovery_rate"] - baseline_metrics["recovery_rate"]

    report = {
        "experiment_info": {
            "timestamp": datetime.utcnow().isoformat(),
            "seed": seed,
            "sample_size": sample_size
        },
        "baseline": baseline_metrics,
        "revenueos": revenueos_metrics,
        "comparison": {
            "incremental_recovered": incremental_recovered,
            "incremental_recovery_rate": incremental_rate,
            "relative_improvement_recovered": incremental_recovered / baseline_metrics["total_recovered"] if baseline_metrics["total_recovered"] > 0 else None,
            "relative_improvement_rate": incremental_rate / baseline_metrics["recovery_rate"] if baseline_metrics["recovery_rate"] > 0 else None
        }
    }
    return report

def save_report(report: Dict[str, Any], directory: str = "data/experiments") -> str:
    """
    Save the report to a JSON file in the given directory.

    Args:
        report: The report dict to save
        directory: Directory to save the report in (relative to the project root)

    Returns:
        The path to the saved report file.
    """
    # Ensure the directory exists
    os.makedirs(directory, exist_ok=True)
    filename = f"report_{report['experiment_info']['seed']}.json"
    path = os.path.join(directory, filename)
    with open(path, 'w') as f:
        json.dump(report, f, indent=2)
    return path