"""Gender detection from Indian first names (best-effort heuristic).

Returns 'male', 'female', or 'unknown'.
The dataset covers ~600 common Indian first names. We fall back to a
phonetic-suffix heuristic for names not in the list.
"""

# Common Indian male first names (lowercase)
MALE_NAMES = {
    "aarav", "aarush", "aayush", "abhay", "abhijeet", "abhilash", "abhinav", "abhishek",
    "aditya", "advait", "adwait", "ahaan", "ajay", "ajit", "akash", "akhil", "akshat",
    "akshay", "amal", "aman", "ambar", "amit", "amitabh", "amol", "anand", "anant",
    "aniket", "anil", "animesh", "anirudh", "ankit", "ankur", "ansh", "anuj", "anurag",
    "anvit", "arav", "arihant", "arjun", "arnav", "aryan", "ashish", "ashutosh", "ashwin",
    "atharv", "atharva", "atin", "atul", "avaneesh", "avinash", "ayaan", "ayush", "ayushman",
    "balaji", "bharat", "bhaskar", "bhavesh", "bishal", "chaitanya", "chandan", "chetan",
    "chirag", "darsh", "daksh", "deepak", "deepanshu", "dev", "devansh", "dhaval", "dhanush",
    "dheeraj", "dhruv", "dhruva", "digvijay", "dinesh", "divya", "dushyant", "ekansh", "eshan",
    "faisal", "farhan", "gagan", "ganesh", "gaurav", "gautam", "girish", "gokul", "gopal",
    "govind", "harish", "harsh", "harshit", "harshvardhan", "hemant", "himanshu", "hitesh",
    "indrajit", "ishaan", "ishan", "ishwar", "jagdish", "jai", "jatin", "jay", "jayant",
    "jeet", "jignesh", "jitendra", "jivan", "kabir", "kalpit", "kamal", "kanishk", "karan",
    "karthik", "kartik", "keshav", "ketan", "kishan", "kishore", "krish", "krishna",
    "krunal", "kshitij", "kumar", "kunal", "lakshay", "lakshya", "lalit", "lokesh", "madhav",
    "mahendra", "mahesh", "manan", "manas", "manav", "mandeep", "manish", "manoj", "mayank",
    "milan", "mithun", "mohammad", "mohammed", "mohit", "mukesh", "mukul", "munna", "naman",
    "narayan", "naresh", "navin", "nayan", "neeraj", "nikhil", "niket", "nilesh", "nipun",
    "nirmal", "nirav", "nishant", "nitesh", "nitin", "om", "omkar", "ojas", "pankaj",
    "parag", "parth", "parveen", "pawan", "piyush", "prabhat", "pradeep", "praful",
    "prajwal", "prakash", "pramod", "pranav", "pranay", "prashant", "prateek", "praveen",
    "praveer", "prem", "puneet", "purva", "raghav", "raghu", "rahul", "raj", "rajat",
    "rajesh", "rajiv", "rakesh", "ram", "raman", "ramesh", "ranjit", "ravi", "raviraj",
    "rishabh", "rishi", "ritesh", "rituraj", "rohan", "rohit", "ronit", "rudra", "rushil",
    "sachin", "sagar", "sahil", "samar", "sameer", "sandeep", "sanjay", "sanjeev", "sankalp",
    "santosh", "sarthak", "satish", "satya", "saurabh", "saurav", "shailesh", "shantanu",
    "shashank", "shiv", "shivam", "shivansh", "shivraj", "shourya", "shrey", "shubham",
    "siddharth", "siddhart", "siddhant", "sidharth", "sohan", "som", "sonu", "soumya",
    "sourav", "subhash", "sudhakar", "sudhanshu", "sudhir", "sujay", "sujit", "suket",
    "suman", "sumit", "sundar", "sunil", "suraj", "suresh", "swapnil", "swaroop", "tanay",
    "tanish", "tanmay", "tanuj", "tarun", "tejas", "tilak", "trilok", "tushar", "uday",
    "udit", "ujjwal", "ulhas", "umang", "umesh", "utkarsh", "uttam", "vaibhav", "vansh",
    "varun", "vasu", "ved", "vedant", "veer", "vibhav", "vijay", "vikas", "vikram",
    "vikrant", "vimal", "vinay", "vineet", "vinod", "vipin", "viraj", "viral", "virat",
    "vishal", "vishesh", "vishnu", "vishwa", "vivaan", "vivek", "yash", "yashwant",
    "yatharth", "yatin", "yogendra", "yogesh", "yuvraj", "zaheer", "zubair",
}

FEMALE_NAMES = {
    "aaradhya", "aaradhya", "aanya", "aarna", "aashi", "aasha", "aastha", "aayushi",
    "aditi", "advika", "aishwarya", "akanksha", "akshara", "akshita", "alia", "alisha",
    "alka", "alok", "ambika", "amisha", "amrita", "anamika", "ananya", "angel", "anika",
    "anisha", "anita", "anjali", "anjana", "annapurna", "ansha", "anshika", "anshu",
    "anu", "anuja", "anumita", "anupama", "anuradha", "anushka", "anwesha", "aparna",
    "apoorva", "arpita", "aruna", "asha", "ashika", "ashima", "ashwini", "avani",
    "ayushi", "babita", "barkha", "bhakti", "bharti", "bhavana", "bhavika", "bhavna",
    "bhumi", "bhumika", "bina", "binita", "chaitali", "chanchal", "chandrika", "charu",
    "chetana", "chhavi", "damini", "darshana", "deeksha", "deepa", "deepali", "deepika",
    "deepti", "devika", "dhara", "dhruvi", "diksha", "dimple", "disha", "divya",
    "drishti", "ekta", "esha", "falguni", "farah", "gargi", "garima", "gauri", "gayatri",
    "geeta", "gita", "gopi", "gunjan", "hamsika", "hansa", "harshita", "heena",
    "hemali", "hetal", "hina", "iesha", "indira", "isha", "ishika", "ishita", "jaya",
    "jaymala", "jenisha", "jhanvi", "jia", "jigna", "jinal", "jiya", "jyoti", "jyotsna",
    "kajal", "kajol", "kalpana", "kamala", "kamini", "kanika", "kanishka", "kanta",
    "kareena", "karina", "karishma", "karuna", "kashish", "katrina", "kavya", "kavita",
    "khushboo", "khushbu", "khushi", "kiran", "kirti", "komal", "kriti", "krithika",
    "krishna", "kruti", "kumari", "kusum", "lakshmi", "lalita", "lata", "lavanya",
    "lavina", "leela", "leena", "lekha", "lipi", "lipika", "madhavi", "madhu", "madhuri",
    "madhushree", "mahek", "maitri", "malavika", "malini", "manasi", "manju", "manjula",
    "mansi", "manvi", "manya", "maya", "meena", "meenakshi", "meera", "megha", "mehak",
    "mehul", "mira", "misha", "mishti", "mita", "mitali", "mohini", "moksha", "monica",
    "monika", "muskan", "muskaan", "mythili", "nainika", "namita", "namrata", "nanda",
    "nandini", "nandita", "nara", "narmada", "navya", "neelam", "neelima", "neera",
    "neeraja", "neerja", "neetu", "neha", "netra", "nidhi", "nikita", "nilima", "nira",
    "nirmala", "nisha", "nishtha", "niti", "nitya", "noor", "nupur", "nutan", "padma",
    "pakhi", "pallavi", "pari", "parul", "payal", "pia", "pinky", "poonam", "pooja",
    "pragati", "pragya", "prachi", "pranjal", "preeti", "preity", "prerna", "preranna",
    "preya", "priya", "priyanka", "punam", "pushpa", "radha", "radhika", "ragini", "rajni",
    "rama", "ramya", "ranjana", "rasna", "ratan", "ratna", "rekha", "rena", "renu",
    "renuka", "reshma", "richa", "rina", "rishika", "ritika", "ritu", "rohini", "roma",
    "roshni", "ruchi", "rukmini", "rupa", "ruchira", "rupali", "saachi", "saanvi",
    "sadhana", "sahana", "sai", "saira", "sakshi", "salma", "samaira", "sameera",
    "samiksha", "samita", "samiya", "sana", "sandhya", "sangeeta", "sanika", "sanjana",
    "sanjivani", "sanya", "saral", "saraswati", "sarika", "saroja", "savita", "seema",
    "shagun", "shakti", "shalaka", "shalini", "shanaya", "shanti", "sharanya", "sharmila",
    "shashi", "sheetal", "shilpa", "shiprali", "shipra", "shivani", "shradha", "shraddha",
    "shreya", "shreyasi", "shri", "shriya", "shubhi", "shuchi", "sia", "siddhi", "sima",
    "simi", "simran", "sindhu", "sita", "smita", "sneha", "snehal", "soha", "sona", "sonal",
    "sonali", "sonam", "soniya", "soumya", "sristi", "srija", "srishti", "subha", "subhi",
    "subhra", "suchi", "suchita", "sudeshna", "suhana", "suhasini", "sujata", "sukanya",
    "sukhi", "sulekha", "sumana", "suman", "sumati", "sumi", "sumona", "sunaina", "sunanda",
    "sundari", "sunidhi", "sunita", "supriya", "surabhi", "surekha", "surya", "sushila",
    "sushma", "suvarna", "swarna", "swaroopa", "swati", "swechha", "tabu", "tamanna",
    "tania", "tanisha", "tanu", "tanuja", "tanushree", "tanvi", "tara", "tarini",
    "tarunika", "tasleem", "tehsil", "tejal", "tilottama", "tina", "trisha", "triveni",
    "tulika", "tulsi", "twinkle", "uma", "urmila", "urvashi", "usha", "utpala", "vaani",
    "vaidehi", "vaishali", "vaishnavi", "vandana", "vanita", "vanya", "varsha", "varuni",
    "vasudha", "vasundhara", "veda", "vedika", "vibha", "vidya", "vijaya", "vimal",
    "vinaya", "vineeta", "vinodini", "vrinda", "yamini", "yashashree", "yashika", "yashasvi",
    "yasmin", "yogita", "zara", "zeenat", "zoya",
}


def detect_gender(first_name: str) -> str:
    """Return 'male', 'female', or 'unknown' from a first name."""
    if not first_name:
        return "unknown"
    name = first_name.strip().lower()
    # Strip non-alpha
    name = "".join(c for c in name if c.isalpha())
    if not name:
        return "unknown"
    if name in MALE_NAMES:
        return "male"
    if name in FEMALE_NAMES:
        return "female"
    # Suffix heuristic for Indian names not in list
    female_suffixes = ("a", "i", "ee", "ya", "ika", "isha", "anya", "ita", "ini", "rita", "lika")
    male_suffixes = ("an", "esh", "it", "ish", "raj", "deep", "veer", "endra", "ander", "th")
    for suf in male_suffixes:
        if name.endswith(suf):
            return "male"
    for suf in female_suffixes:
        if name.endswith(suf):
            return "female"
    return "unknown"


def detect_gender_from_email(email: str) -> str:
    """Extract first name from UPES email (`name.NNNN@stu.upes.ac.in`) and detect gender."""
    if not email or "@" not in email:
        return "unknown"
    local = email.split("@", 1)[0]
    first = local.split(".", 1)[0] if "." in local else local
    return detect_gender(first)
