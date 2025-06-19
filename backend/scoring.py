
# scoring.py
import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def score_candidate(candidate_data, job_description, weights=None):
    score = 0; total_w = 0
    # weights
    defaults = {'skills':50,'education':20,'experience':20,'certifications':10}
    fw = (weights.copy() if weights else defaults.copy())
    s = sum(fw.values());
    fw = {k:v*(100/s) for k,v in fw.items()} if s!=100 else fw

    # skills
    cs = {s.lower() for s in candidate_data.get('skills',[])}
    rs = {s.lower() for s in job_description.get('required_skills',[])}
    ss = (len(cs&rs)/len(rs)*fw['skills']) if rs else 0
    print(f"Skill matches {cs&rs}, score: {ss}")
    score+=ss; total_w+=fw['skills']
    cand_edu = (candidate_data.get('education') or '').lower()
    min_edu_list = job_description.get('min_education', [])
    if isinstance(min_edu_list, str):
        min_edu_list = [min_edu_list.lower()]
    elif isinstance(min_edu_list, list):
        min_edu_list = [edu.lower() for edu in min_edu_list]
    else:
        min_edu_list = []

    edu_match = any(req_edu in cand_edu for req_edu in min_edu_list)
    edu_score = fw['education'] if edu_match else 0
    logger.debug(f"EDUCATION → looking for one of {min_edu_list} in '{cand_edu}', score = {edu_score:.2f}")

    score += edu_score
    total_w += fw['education']


    # experience
    cy = candidate_data.get('experience_years',0)
    ry = job_description.get('min_experience_years',0)
    if ry>0:
        exp_s = fw['experience'] if cy>=ry else (cy/ry)*fw['experience']
    else: exp_s=0
    print(f"Experience years {cy}/{ry}, score: {exp_s}")
    score+=exp_s; total_w+=fw['experience']

    # certifications
    cc = {c.lower() for c in candidate_data.get('certifications',[])}
    rc = {c.lower() for c in job_description.get('required_certifications',[])}
    cscr = (len(cc&rc)/len(rc)*fw['certifications']) if rc else 0
    print(f"Cert matches {cc&rc}, score: {cscr}")
    score+=cscr; total_w+=fw['certifications']

    final = (score/total_w)*100 if total_w else 0
    print(f"Total raw score {score}, total weight {total_w}, final scaled {final}")
    return round(final,2)
