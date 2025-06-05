def score_candidate(candidate_data, job_description, weights=None):
    """
    candidate_data: dict with keys like skills, education, experience, certifications
    job_description: dict with required_skills, min_education, min_experience_years, required_certifications
    weights: dict with keys: skills, education, experience, certifications (must sum to 100)

    Returns: float score (0-100)
    """

    score = 0
    total_weight = 0

    # Default Weights
    default_weights = {
        "skills": 50,
        "education": 20,
        "experience": 20,
        "certifications": 10
    }

    # Use custom weights if passed, else fallback to default
    final_weights = weights if weights else default_weights

    # Normalize to ensure total is 100
    weight_sum = sum(final_weights.values())
    if weight_sum != 100:
        scaling_factor = 100 / weight_sum
        final_weights = {k: v * scaling_factor for k, v in final_weights.items()}

    # Skills score
    candidate_skills = set(s.lower() for s in candidate_data.get('skills', []))
    required_skills = set(s.lower() for s in job_description.get('required_skills', []))
    if required_skills:
        skill_match_count = len(candidate_skills.intersection(required_skills))
        skill_score = (skill_match_count / len(required_skills)) * final_weights["skills"]
    else:
        skill_score = 0
    score += skill_score
    total_weight += final_weights["skills"]

    # Education score
    candidate_education = candidate_data.get('education', [])
    required_education = job_description.get('min_education', "").lower()
    education_score = 0
    if required_education:
        for edu in candidate_education:
            if required_education in edu.lower():
                education_score = final_weights["education"]
                break
    score += education_score
    total_weight += final_weights["education"]

    # Experience score
    candidate_exp_years = candidate_data.get('experience_years', 0)
    required_exp_years = job_description.get('min_experience_years', 0)
    if candidate_exp_years >= required_exp_years:
        experience_score = final_weights["experience"]
    else:
        experience_score = (
            (candidate_exp_years / required_exp_years) * final_weights["experience"]
            if required_exp_years > 0 else 0
        )
    score += experience_score
    total_weight += final_weights["experience"]

    # Certifications score
    candidate_certs = set(c.lower() for c in candidate_data.get('certifications', []))
    required_certs = set(c.lower() for c in job_description.get('required_certifications', []))
    if required_certs:
        cert_match_count = len(candidate_certs.intersection(required_certs))
        cert_score = (cert_match_count / len(required_certs)) * final_weights["certifications"]
    else:
        cert_score = 0
    score += cert_score
    total_weight += final_weights["certifications"]

    # Final score scaled to 0-100
    final_score = (score / total_weight) * 100 if total_weight > 0 else 0
    return round(final_score, 2)
